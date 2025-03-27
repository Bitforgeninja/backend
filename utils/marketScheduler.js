// utils/marketScheduler.js
import cron from 'node-cron';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import Market from '../models/marketModel.js';

dayjs.extend(customParseFormat);

export function scheduleMarketTasks() {
  console.log('🕐 Initializing market betting scheduler...');

  cron.schedule('* * * * *', async () => {
    try {
      const now = dayjs();
      console.log(`\n📅 [${now.format('YYYY-MM-DD HH:mm:ss')}] Running market scheduler...`);

      const markets = await Market.find();
      console.log(`🔍 Found ${markets.length} markets to check...`);

      for (let market of markets) {
        const todayStr = dayjs().format('YYYY-MM-DD');

        const marketStartsAt = dayjs(`${todayStr} 6:00 AM`, 'YYYY-MM-DD hh:mm A'); // All markets start at 6:00 AM
        const openDeadline = dayjs(`${todayStr} ${market.openTime}`, 'YYYY-MM-DD hh:mm A').subtract(10, 'minute');
        const closeDeadline = dayjs(`${todayStr} ${market.closeTime}`, 'YYYY-MM-DD hh:mm A').subtract(10, 'minute');

        console.log(`\n📍 Market: ${market.name}`);
        console.log(`   🔓 Starts At: 6:00 AM`);
        console.log(`   🕛 Open Time: ${market.openTime} → Close Open Betting At: ${openDeadline.format('hh:mm A')}`);
        console.log(`   🕖 Close Time: ${market.closeTime} → Close Market At: ${closeDeadline.format('hh:mm A')}`);
        console.log(`   ⏱ Current Time: ${now.format('hh:mm A')}`);
        console.log(`   🔐 isBettingOpen: ${market.isBettingOpen} | 🟢 openBetting: ${market.openBetting}`);

        const updates = {};

        // ✅ Open both bettings at 00:00 AM
        if (now.format('HH:mm') === '00:00') {
          if (!market.isBettingOpen) {
            updates.isBettingOpen = true;
            console.log(`   ✅ Opening full market betting`);
          }
          if (!market.openBetting) {
            updates.openBetting = true;
            console.log(`   ✅ Opening open betting`);
          }
        }
        

        // ✅ Close open betting at (openTime - 10 minutes)
        if (now.isAfter(openDeadline) && market.openBetting) {
          updates.openBetting = false;
          console.log(`   🚫 Closing open betting`);
        }

        // ✅ Close full market at (closeTime - 10 minutes)
        if (now.isAfter(closeDeadline) && market.isBettingOpen) {
          updates.isBettingOpen = false;
          console.log(`   ❌ Closing full market betting`);
        }

        if (Object.keys(updates).length > 0) {
          await Market.findByIdAndUpdate(market._id, { $set: updates });
          console.log(`   🔄 Updated market flags:`, updates);
        } else {
          console.log(`   ✅ No updates needed`);
        }
      }

    } catch (err) {
      console.error('❌ Error in market scheduler:', err);
    }
  });

  console.log('✅ Market scheduler running every minute...');
}

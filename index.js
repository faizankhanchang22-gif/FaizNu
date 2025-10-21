const { Telegraf } = require('telegraf');
const axios = require('axios'); // For making the external API call

// ⚙️ CONFIGURATION
// Ensure this BOT_TOKEN environment variable is set correctly on Vercel.
const BOT_TOKEN = process.env.BOT_TOKEN || '8389699701:AAHneKVv07bhQAHHHLmtT8veAXzEu70Ckag';

// Group chat ID where the bot must work. (Aapne UID -1003089918721 diya tha, usko hardcode rehne dete hain.)
const TARGET_GROUP_ID = -1003089918721; 

// List of mandatory channel usernames (UIDs hata di gayi hain, lekin Admin banana zaroori hai).
const REQUIRED_CHANNELS = [
    '@freefirelkies',
    '@owner_of_this_all'
];

const bot = new Telegraf(BOT_TOKEN);

/**
 * Checks if a user is a member of all required channels (using usernames).
 * Note: Bot must be an administrator in all channels for this to work.
 */
async function isUserMemberOfAllChannels(userId) {
    for (const channelUsername of REQUIRED_CHANNELS) {
        try {
            // Telegraf can use the username instead of the UID.
            const member = await bot.telegram.getChatMember(channelUsername, userId);

            // Acceptable statuses: 'member', 'creator', 'administrator'.
            if (!['member', 'creator', 'administrator'].includes(member.status)) {
                return false;
            }
        } catch (error) {
            // **Critical Error Check:** Agar bot ko access nahi hai, toh 400 ya 403 error aayega.
            console.error(`Error checking channel membership for ${channelUsername}:`, error.message);
            return false; 
        }
    }
    return true; 
}

/**
 * Function to call the external API with the user's UID.
 */
async function callExternalApi(userId) {
    const BASE_URL = 'http://69.62.118.156:19126/like';
    const params = {
        uid: userId, // User's Telegram ID will be used as the 'uid'
        server_name: 'ind',
        key: 'freeapi'
    };
    
    try {
        const response = await axios.get(BASE_URL, { params });
        console.log(`API Call Successful for UID ${userId}. Response:`, response.data);
        return response.data; 
    } catch (error) {
        console.error(`Error calling external API for UID ${userId}:`, error.message);
        return { status: false, msg: 'External API server error or failed to connect.' }; 
    }
}

/**
 * Middleware: Check if the message is from the target group.
 */
bot.use(async (ctx, next) => {
    // Check if the chat ID is the target group ID.
    if (ctx.chat && ctx.chat.id === TARGET_GROUP_ID) {
        return next(); // Proceed to command handlers
    } else if (ctx.chat && ctx.chat.id !== TARGET_GROUP_ID) {
        // Reply only if a command is sent outside the group.
        if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
            await ctx.reply(`❌ **Yeh Bot Sirf Group Chat Main Work Karega.**`);
        }
    }
});


/**
 * Handler for the /start command.
 */
bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const isMember = await isUserMemberOfAllChannels(userId);

    if (isMember) {
        // ✅ STEP 1: Channels Verified
        await ctx.replyWithMarkdown(`**✅ Channels Verified.**\n\nAb Aapke Liye External API Call Kar Raha Hoon...`);

        // 🔥 STEP 2: Call the External API
        const apiResponse = await callExternalApi(userId);

        if (apiResponse && apiResponse.status === true) {
            const successMessage = `**🎉 Success!**\n\n**Aapka Kaam Ho Gaya.**\n\nAPI Status: ${apiResponse.msg || 'Done'}`;
            await ctx.replyWithMarkdown(successMessage);
        } else {
            const failureMessage = `**❌ Error:** External API Call Mein Masla Hua.\n\nAPI Response: ${apiResponse.msg || 'No response received.'}`;
            await ctx.replyWithMarkdown(failureMessage);
        }

    } else {
        // ❌ Failure: User has not joined all channels
        const requiredLinks = REQUIRED_CHANNELS.map(c => `• **${c}**`).join('\n');
        
        const joinMessage = `**⚠️ Pehle Zaroori Channels Join Karein!**\n\n**Aap Ne Darj Zeel Channels Join Nahi Kiye:**\n${requiredLinks}\n\n**Channels Join Karne Ke Baad Dobara /start Command Bhejein.**`;
        
        // Create buttons using usernames
        const buttons = REQUIRED_CHANNELS.map(c => ([{ text: `🔗 Join ${c}`, url: `https://t.me/${c.substring(1)}` }]));
        
        await ctx.replyWithMarkdown(joinMessage, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
});


// 🚀 Vercel Export Setup (GET request fix)
module.exports = async (req, res) => {
    if (req.method === 'POST' && req.body) {
        try {
            await bot.handleUpdate(req.body, res);
        } catch (error) {
            console.error('Error handling Telegram update:', error.message);
            res.statusCode = 200; 
            res.end();
        }
    } else {
        res.statusCode = 200;
        res.end('Bot is running and waiting for Telegram updates.');
    }
};

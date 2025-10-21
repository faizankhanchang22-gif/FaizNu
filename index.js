const { Telegraf } = require('telegraf');
const axios = require('axios'); // For making the external API call

// ⚙️ CONFIGURATION
// Ensure this BOT_TOKEN environment variable is set correctly on Vercel.
const BOT_TOKEN = process.env.BOT_TOKEN || '8389699701:AAHneKVv07bhQAHHHLmtT8veAXzEu70Ckag';

// Group chat UID where the bot is allowed to work.
const TARGET_GROUP_ID = -1003089918721; 

// List of mandatory channel UIDs and usernames for display.
const REQUIRED_CHANNELS = [
    { id: -1003089918721, username: '@freefirelkies' }, 
    { id: -1002018904140, username: '@owner_of_this_all' } 
];

const bot = new Telegraf(BOT_TOKEN);

/**
 * Checks if a user is a member of all required channels.
 * Note: Bot must be an administrator in all channels for this to work.
 */
async function isUserMemberOfAllChannels(userId) {
    for (const channel of REQUIRED_CHANNELS) {
        try {
            const member = await bot.telegram.getChatMember(channel.id, userId);
            // Acceptable statuses: 'member', 'creator', 'administrator'.
            if (!['member', 'creator', 'administrator'].includes(member.status)) {
                return false;
            }
        } catch (error) {
            console.error(`Error checking channel membership for ${channel.username}:`, error.message);
            // If the bot cannot access the channel, we assume failure for security.
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
        return { status: false, msg: 'External API server error.' }; // Return custom error object
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
    // Ignore all other messages and private chats.
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
            // API call failed or returned status: false
            const failureMessage = `**❌ Error:** External API Call Mein Masla Hua.\n\nAPI Response: ${apiResponse.msg || 'No response received.'}`;
            await ctx.replyWithMarkdown(failureMessage);
        }

    } else {
        // ❌ Failure: User has not joined all channels
        const requiredLinks = REQUIRED_CHANNELS.map(c => `• **${c.username}**`).join('\n');
        
        const joinMessage = `**⚠️ Pehle Zaroori Channels Join Karein!**\n\n**Aap Ne Darj Zeel Channels Join Nahi Kiye:**\n${requiredLinks}\n\n**Channels Join Karne Ke Baad Dobara /start Command Bhejein.**`;
        
        const buttons = REQUIRED_CHANNELS.map(c => ([{ text: `🔗 Join ${c.username}`, url: `https://t.me/${c.username.substring(1)}` }]));
        
        await ctx.replyWithMarkdown(joinMessage, {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
});


// 🚀 Vercel Export Setup (The fix for the "update_id" error is here)
module.exports = async (req, res) => {
    // Check if the request is a POST request (from Telegram webhook)
    if (req.method === 'POST' && req.body) {
        try {
            await bot.handleUpdate(req.body, res);
        } catch (error) {
            // Log the error but send a 200 OK so Telegram doesn't keep retrying.
            console.error('Error handling Telegram update:', error.message);
            res.statusCode = 200; 
            res.end();
        }
    } else {
        // Handle GET requests (browser visits, Vercel monitors) gracefully.
        res.statusCode = 200;
        res.end('Bot is running and waiting for Telegram updates.');
    }
};

// Set commands for Telegram interface
bot.telegram.setMyCommands([
    { command: 'start', description: 'Bot ko start karein aur channels ki membership check karein.' }
]);

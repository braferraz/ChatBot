const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const pool = require('./db');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
  console.log('🤖 Cliente pronto! Escutando status de leitura em tempo real...');
});

client.on('message_ack', async (msg, ack) => {
  if (ack === 3) {
    const msgId = msg.id._serialized;

    try {
      const [rows] = await pool.execute(
        'SELECT id FROM mensagens_enviadas WHERE message_id = ? AND lida = FALSE',
        [msgId]
      );

      if (rows.length > 0) {
        await pool.execute(
          `UPDATE mensagens_enviadas 
           SET lida = TRUE, data_leitura = NOW() 
           WHERE message_id = ?`,
          [msgId]
        );
        console.log(`✅ Mensagem lida (${msgId}) em ${new Date().toLocaleString()}`);
      }
    } catch (err) {
      console.error('❌ Erro ao atualizar leitura no banco:', err.message);
    }
  }
});

client.initialize();

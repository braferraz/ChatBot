const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const csv = require('csv-parser');
const pool = require('./db');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

// Gera mensagens personalizadas
function gerarMensagem(nome) {
  const mensagens = [
    `Olá ${nome}, tudo bem? Dá uma olhada nesse vídeo incrível! 👇`,
    `Ei ${nome}! Encontrei esse vídeo e pensei em você.`,
    `Fala ${nome}! Veja esse vídeo, acho que você vai curtir 😄`
  ];
  return mensagens[Math.floor(Math.random() * mensagens.length)];
}

// Carrega contatos do CSV
function carregarNumeros() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream('numbers.csv')
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', err => reject(err));
  });
}

// Envia mensagens com delay
async function enviarMensagens() {
  const contatos = await carregarNumeros();
  const video = await MessageMedia.fromFilePath('./media/video.mp4');

  for (let i = 0; i < contatos.length; i++) {
    const { numero, nome } = contatos[i];
    const mensagem = gerarMensagem(nome);
    try {
      const msg = await client.sendMessage(numero, video, { caption: mensagem });

      await pool.execute(
        'INSERT INTO mensagens_enviadas (numero, message_id, status) VALUES (?, ?, ?)',
        [numero, msg.id._serialized, 'enviado']
      );

      console.log(`✅ Mensagem enviada para ${numero}`);
    } catch (err) {
      console.error(`❌ Erro ao enviar para ${numero}:`, err.message);
    }

    // Delay aleatório entre 10 e 20 segundos
    const delay = Math.floor(Math.random() * 20000) + 10000;
    await new Promise(r => setTimeout(r, delay));
  }

  console.log('🚀 Todos os envios foram realizados!');
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
  console.log('🤖 Cliente pronto!');
  enviarMensagens();
});

client.initialize();

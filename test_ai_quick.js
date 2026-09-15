require('dotenv').config();
const { chatCompany } = require('./server/services/aiService');

console.log('Testando chamada para a IA...');
chatCompany('Transportes Santos', 'Qual a orientação para autuação vencendo hoje?')
  .then(reply => {
    console.log('--- RESPOSTA DA IA ---');
    console.log(reply);
    console.log('--- FIM ---');
  })
  .catch(err => {
    console.error('Erro na IA:', err.message);
  });

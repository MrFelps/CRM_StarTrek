async function testPdf() {
  try {
    const samplePdfRaw = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 160 >> stream
BT
/F1 12 Tf
72 712 Td
(AUTO DE INFRACAO DETRAN-SP 892341 - PLACA FGB-2026 - VALOR COM DESCONTO SNE: R$ 234,77 - VENCIMENTO: 18/09/2026 - INDICAÇÃO DE CONDUTOR ATE: 14/09/2026) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
430
%%EOF`;

    const base64 = Buffer.from(samplePdfRaw).toString('base64');

    console.log('⏳ Enviando PDF para /api/ai/company-chat...');
    const res = await fetch('http://localhost:3001/api/ai/company-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Transportadora Rápido Sol',
        message: 'Extraia os dados da multa deste PDF e me oriente.',
        file: {
          name: 'notificacao_autuacao_FGB2026.pdf',
          base64: `data:application/pdf;base64,${base64}`
        }
      })
    });

    const data = await res.json();
    console.log('✅ Resposta da IA sobre o PDF:');
    console.log(data.reply);
  } catch (err) {
    console.error('❌ Erro no teste de PDF:', err);
  }
}

testPdf();

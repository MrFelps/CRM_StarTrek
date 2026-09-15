# 9Router Cloud / Local

Serviço de roteamento e gateway para modelos de Inteligência Artificial (compatível com a API OpenAI).

## Como funciona no CRM
O CRM está configurado para se comunicar com o 9Router tanto na nuvem quanto localmente na porta `20128`:
1. Tenta o endpoint em nuvem (Render)
2. Se indisponível ou offline, faz fallback automático para o 9Router local em `http://localhost:20128/v1`

---

## Como executar

### Opção 1: Via Node.js (Sem Docker)
Dentro desta pasta:
```bash
npm install
npm start
```
Ou a partir da raiz do projeto CRM:
```bash
npm run router
```

### Opção 2: Via Docker
```bash
docker build -t 9router .
docker run -d -p 20128:20128 --name 9router 9router
```

O serviço ficará escutando em `http://localhost:20128`.

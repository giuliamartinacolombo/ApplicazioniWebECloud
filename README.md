# 🎵 SN4M – Social Network for Music

SN4M è una web application client-side per la gestione di playlist musicali e la condivisione all’interno di community tematiche.

L’applicazione integra la **Spotify Web API** per la ricerca di artisti e brani e utilizza **LocalStorage** per simulare un backend persistente.

---

# 🚀 Panoramica

SN4M consente agli utenti di:

- Registrarsi e autenticarsi
- Selezionare generi musicali preferiti
- Cercare artisti tramite Spotify API
- Creare playlist personalizzate
- Condividere playlist nelle community
- Importare playlist condivise
- Modificare il proprio profilo
- Eliminare definitivamente il proprio account

L’intero sistema è sviluppato **senza backend reale**.

---


### Struttura tecnica

- Separazione completa HTML / CSS / JS
- Componenti UI riutilizzabili
- Gestione stato centralizzata
- Evento custom per aggiornamento dinamico UI
- Integrazione API esterna (Spotify)

---

# 💾 Gestione dati (LocalStorage)

Poiché non è presente un backend, SN4M utilizza il **Web Storage API** per la persistenza dei dati.

## Chiavi principali

- `users` → lista utenti registrati
- `currentUser` → utente autenticato
- `sn4m_playlists_<userId>` → playlist dell’utente
- `sn4m_communities` → community create
- `sn4m_spotify_token`
- `sn4m_spotify_token_exp`

---

## 📌 Struttura dati utente

```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "password": "string",
  "genres": ["Pop", "Rock"],
  "favoriteArtists": ["Artist 1", "Artist 2"],
  "createdAt": "ISO Date",
  "avatar": ""
}
```
---

## 📌 Struttura dati playlist

```json
{
  "id": "pl_xxx",
  "ownerId": "userId",
  "title": "Nome playlist",
  "desc": "Descrizione",
  "tags": ["tag1", "tag2"],
  "tracks": [],
  "tracksCount": 0,
  "createdAt": 123456789,
  "updatedAt": 123456789,
  "sharedCommunityIds": []
}
```

---
## 🔐 Autenticazione

Il sistema implementa:

- Registrazione con validazione campi
- Verifica unicità email e username
- Login con controllo credenziali
- Protezione pagine riservate
- Eliminazione completa account

> ⚠️ Le password non sono criptate (progetto didattico client-side).

---

## 👥 Sistema Community

Le community permettono di:

- Creare gruppi tematici
- Entrare/uscire da una community
- Condividere playlist con membri
- Visualizzare playlist condivise

Ogni playlist può essere associata a più community tramite:

```javascript
sharedCommunityIds: []
```

## 🔄 Importazione Playlist

Le playlist condivise possono essere importate.

Il sistema crea una copia con:

- Nuovo ID
- `ownerId` aggiornato
- Rimozione condivisione
- Flag `isImported`

Questo simula il comportamento tipico delle piattaforme musicali.

---

## 🎧 Integrazione Spotify Web API

SN4M utilizza il **Client Credentials Flow (OAuth 2.0)** per:

- Ricerca artisti in fase di registrazione
- Ricerca artisti nel profilo
- Ricerca brani per creazione playlist

---

## ⚠️ IMPORTANTE: Configurazione Spotify API

Per motivi di sicurezza, le credenziali Spotify **non sono incluse nel repository**.

Per far funzionare correttamente la ricerca artisti e brani è necessario:

### 1️⃣ Creare un’app Spotify

- Visitare: https://developer.spotify.com/dashboard  
- Creare una nuova App  
- Ottenere:
  - Client ID  
  - Client Secret  

---

### 2️⃣ Inserire le credenziali nei file JavaScript

Nei file:

- `register.js`
- `profile.js`
- `playlists.js`
- `homepage.js`

Sostituire:

```javascript
const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";
const SPOTIFY_CLIENT_SECRET = "YOUR_SPOTIFY_CLIENT_SECRET";
```
con i propri valori.

---

### 3️⃣ Nessuna configurazione Redirect URI necessaria

Poiché viene utilizzato il **Client Credentials Flow**, non è richiesto redirect URI.

> ⚠️ **Nota di sicurezza**  
> Le credenziali sono lato client e quindi visibili nel codice.  
> In un ambiente di produzione reale sarebbe necessario un backend per proteggere il Client Secret.

---

## 🎨 UI & UX

- Tema scuro con palette viola  
- Layout responsive  
- Sidebar dinamica  
- Modal interattive  
- Tile layout stile Spotify  
- Animazioni decorative (vinili rotanti)  
- Componenti riutilizzabili  

### Tecniche utilizzate

- CSS Variables  
- Flexbox  
- CSS Grid  
- Media Queries  
- `backdrop-filter` (glassmorphism)  

---

## 📱 Responsive Design

L’interfaccia è ottimizzata per:

- Desktop  
- Tablet  
- Mobile  

La sidebar viene nascosta sotto `980px`.  
Le griglie si adattano automaticamente su viewport ridotte.

---

## ⚙️ Tecnologie utilizzate

- HTML5  
- CSS3  
- JavaScript (ES6+)  
- Web Storage API  
- Spotify Web API  
- OAuth 2.0 Client Credentials Flow  

---

## ▶️ Come avviare il progetto

1. Clonare il repository  
2. Inserire le proprie credenziali Spotify  
3. Aprire `landing_page.html` in un browser  
4. Registrare un account  
5. Utilizzare l’applicazione  

Non è richiesto alcun server locale.

---

## ⚠️ Limitazioni

- Nessun backend reale  
- Password non criptate  
- Credenziali API visibili lato client  
- Persistenza limitata al browser  
- Nessuna sincronizzazione multi-dispositivo  

---

## 🔮 Possibili miglioramenti futuri

- Implementazione backend (Node.js / Express)  
- Autenticazione JWT  
- Crittografia password  
- Database reale (MongoDB / PostgreSQL)  
- Deploy cloud (Vercel / Render / AWS)  
- Autenticazione Spotify Authorization Code Flow  

---

## 🏫 Contesto accademico

Progetto sviluppato per il corso di:

**Applicazioni Web e Cloud**  
Anno Accademico 2024/2025  

---

## 📄 Licenza

Progetto sviluppato a scopo didattico.




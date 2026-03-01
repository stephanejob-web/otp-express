require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// On stocke les OTP en mémoire : { "email": { code, expiresAt } }
const otpStore = {};

// --- Envoi d'email ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- Route 1 : envoyer l'OTP ---
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  // Générer un code à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Le code expire dans 5 minutes
  // Date.now()              → timestamp actuel en millisecondes  ex: 1700000000000
  // 5 * 60 * 1000           → 5 min en millisecondes            = 300000
  // expiresAt               → timestamp d'expiration            ex: 1700000300000
  const expiresAt = Date.now() + 5 * 60 * 1000;

  // Sauvegarder dans notre "base de données" temporaire
  // otpStore ressemble à ça après cette ligne :
  // {
  //   "alice@gmail.com": { code: "482915", expiresAt: 1700000300000 }
  // }
  otpStore[email] = { code, expiresAt };

  // Envoyer l'email
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Votre code de vérification",
    text: `Votre code est : ${code}. Il expire dans 5 minutes.`,
  });

  res.json({ message: "Code envoyé par email." });
});

// --- Route 2 : vérifier l'OTP et retourner un token ---
app.post("/verify-otp", (req, res) => {
  const { email, code } = req.body;

  const entry = otpStore[email];

  // Vérifier si un OTP existe pour cet email
  if (!entry) {
    return res.status(400).json({ message: "Aucun code trouvé pour cet email." });
  }

  // Vérifier si le code n'est pas expiré
  if (Date.now() > entry.expiresAt) {
    return res.status(400).json({ message: "Code expiré." });
  }

  // Vérifier si le code est correct
  if (entry.code !== code) {
    return res.status(400).json({ message: "Code incorrect." });
  }

  // Supprimer le code après usage
  delete otpStore[email];

  // Générer un JWT token
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

  res.json({ message: "Email vérifié !", token });
});

app.listen(3000, () => console.log("Serveur démarré sur http://localhost:3000"));

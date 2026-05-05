# 🔐 PrivAware v2 — AI-Powered Browser Privacy Inspector

A real-time Chrome extension that uses custom-trained NLP models to detect phishing URLs and analyze privacy policies.

---

## 🚀 Overview

PrivAware scans any website in real time and generates a **privacy risk score (0–100)** using AI models and browser signals.

---

## 🧠 Features

- Phishing URL detection (DistilBERT, 800k+ URLs)
- Privacy policy classification (SAFE / RISKY / DECEPTIVE)
- Tracker & script detection
- Real-time risk scoring

---

## 📊 Risk Scoring

| Signal | Weight |
|--------|--------|
| Phishing Model | 35% |
| Tracker Density | 30% |
| Policy Classification | 25% |
| HTTPS | 10% |

---

## 🏗️ Architecture
Chrome Extension
│
▼
FastAPI Backend (HuggingFace)
├── Phishing Model
└── Policy Model

---

## 🌍 Links

- API: https://V3d4nt7-privaware-api.hf.space  
- Docs: https://V3d4nt7-privaware-api.hf.space/docs  
- Phishing Model: https://huggingface.co/V3d4nt7/privaware-phishing-detector  
- Policy Model: https://huggingface.co/V3d4nt7/privaware-policy-classifier  
- Website: https://V3d4nt7.github.io/privaware-v2  

---

## 🤖 Models

### Phishing Detector
- distilbert-base-uncased  
- Dataset: phishing-dataset + PhiUSIIL  
- Binary classification  

### Policy Classifier
- distilbert-base-uncased  
- Dataset: OPP-115  
- 3-class classification  

---

## 📁 Structure
privaware-v2/
├── ml/
├── backend/
├── extension/
└── web/

---

## 🛠️ Run Locally

### Extension
- Go to `chrome://extensions`
- Enable Developer Mode
- Load `extension/`

### Backend
cd backend
pip install -r requirements.txt
uvicorn app:app –reload

---

## 🧰 Tech Stack

- Python
- FastAPI
- HuggingFace Transformers
- PyTorch
- Chrome Extension API

---

## 🎯 Use Cases

- Detect phishing sites
- Understand privacy risks
- Identify trackers

---

## 📌 Project

B.Tech CSE Final Year Project  
MIT ADT University, Pune  

---

## ⭐ Support

If you found this useful, give it a ⭐

@ -1 +1,134 @@
# privaware-v2
# PrivAware v2 — AI-Powered Browser Privacy Inspector

> A Chrome extension that uses two custom-trained NLP models to detect phishing URLs and deceptive privacy policies in real time.

[![Live API](https://img.shields.io/badge/API-Live%20on%20HuggingFace-orange)](https://V3d4nt7-privaware-api.hf.space/health)
[![Model 1](https://img.shields.io/badge/Model-Phishing%20Detector-blue)](https://huggingface.co/V3d4nt7/privaware-phishing-detector)
[![Model 2](https://img.shields.io/badge/Model-Policy%20Classifier-blue)](https://huggingface.co/V3d4nt7/privaware-policy-classifier)
[![GitHub Pages](https://img.shields.io/badge/Web-GitHub%20Pages-green)](https://V3d4nt7.github.io/privaware-v2)

---

## What it does

Most users never read privacy policies and have no way of knowing if a site is actively tracking or phishing them. PrivAware scans any website in real time and gives a 0–100 privacy risk score based on two AI models trained from scratch.

- **Phishing detector** — DistilBERT fine-tuned on 800,000+ labeled URLs
- **Privacy policy classifier** — DistilBERT fine-tuned on OPP-115 annotated policy corpus
- **Resource scanner** — extracts all third-party scripts, iframes, and trackers loaded by the page
- **Weighted risk formula** — phishing score + tracker density + policy classification + HTTPS check

---

## Live links

| Component | URL |
|-----------|-----|
| API (HuggingFace Spaces) | https://V3d4nt7-privaware-api.hf.space |
| API docs | https://V3d4nt7-privaware-api.hf.space/docs |
| Phishing model | https://huggingface.co/V3d4nt7/privaware-phishing-detector |
| Policy model | https://huggingface.co/V3d4nt7/privaware-policy-classifier |
| Landing page | https://V3d4nt7.github.io/privaware-v2 |

---

## Architecture

```
Chrome Extension (popup.js + content.js)
        │
        │  HTTPS POST /scan-url
        │  HTTPS POST /scan-policy
        ▼
FastAPI Backend (HuggingFace Spaces)
        │
        ├── DistilBERT Phishing Detector
        │   └── trained on 800k URLs
        │
        └── DistilBERT Policy Classifier
            └── trained on OPP-115 corpus
```

---

## Risk scoring formula

| Signal | Weight |
|--------|--------|
| Phishing model confidence | 35% |
| Tracker count and type | 30% |
| Privacy policy classification | 25% |
| HTTPS / transport security | 10% |

---

## Models

### Model 1 — Phishing URL Detector
- Base: `distilbert-base-uncased`
- Dataset: ealvaradob/phishing-dataset + PhiUSIIL (UCI ML Repo)
- Task: Binary classification — LEGITIMATE / PHISHING
- Training: 3 epochs, AdamW lr=2e-5, batch size=64

### Model 2 — Privacy Policy Classifier
- Base: `distilbert-base-uncased`
- Dataset: OPP-115 (alzoubi36/opp_115) — 115 real annotated privacy policies
- Task: 3-class classification — SAFE / RISKY / DECEPTIVE
- Training: 4 epochs, AdamW lr=2e-5, batch size=16

---

## Repo structure

```
privaware-v2/
├── ml/                    # Training notebooks (Google Colab)
│   ├── Day1_Phishing_Dataset.ipynb
│   ├── Day2_Train_Phishing_Model.ipynb
│   ├── Day3_Deploy_To_HuggingFace.ipynb
│   ├── Day4_Privacy_Policy_Model.ipynb
│   └── Retrain_Full_Fix.ipynb
├── backend/               # FastAPI app deployed on HuggingFace Spaces
│   ├── app.py
│   └── requirements.txt
├── extension/             # Chrome extension (Manifest v3)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── background.js
│   └── icons/
└── web/                   # Landing page on GitHub Pages
    └── index.html
```

---

## How to run locally

### Extension
1. Clone this repo
2. Open Chrome → `chrome://extensions`
3. Enable Developer Mode
4. Click Load unpacked → select the `extension/` folder
5. Visit any site and click the PrivAware icon

### Backend (local)
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload
```

---

## Tech stack

`Python` `HuggingFace Transformers` `DistilBERT` `PyTorch` `FastAPI` `Google Colab` `Chrome Extension API` `Manifest v3` `GitHub Pages` `HuggingFace Spaces`

---

## Project context

Final year B.Tech CSE project — MIT ADT University, Pune
Domain: Artificial Intelligence / Machine Learning + Cybersecurity

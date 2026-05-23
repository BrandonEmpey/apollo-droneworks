import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Add global CSS variables for gold and black gradients
const style = document.createElement('style');
style.textContent = `
  :root {
    --gold-start: #C7AE6A;
    --gold-middle: #E2D68B;
    --gold-end: #8A6A2F;
    --gold-gradient: linear-gradient(90deg, var(--gold-start), var(--gold-middle), var(--gold-end));
    --black-gradient: linear-gradient(to bottom, #080d17, #0b111f, #142642);
    
    /* Base colors */
    --gold-light: var(--gold-middle);
    --gold: var(--gold-start);
    --gold-dark: var(--gold-end);
    
    --black-light: #1f1f1f;
    --black: #0b111f;
    --black-dark: #080d17;
    
    --offwhite: #F5F5F5;
  }
  
  /* Gold text gradient */
  .gold-text {
    background: var(--gold-gradient);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

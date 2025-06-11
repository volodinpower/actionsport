import React from "react";
import { getImageUrl } from "../imageUrl";

const Footer = () => {
  // ... navItems и разбиение на колонки как у тебя

  return (
    <footer className="w-full bg-black text-white pb-6 pt-0 px-0 mt-0">
      <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-start gap-8 px-4 pt-3">
        {/* Левая колонка: контакты */}
        <div className="flex flex-col gap-1 basis-full md:basis-1/3 flex-1">
          <img
            src={getImageUrl("/logo.png")}
            alt="Boardshop Logo"
            className="h-auto w-[150px] invert mb-1"
            style={{ maxWidth: 160 }}
          />
          <div className="flex flex-col gap-[2px] text-[11px] text-gray-300">
            {/* Instagram */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                {/* ...твой path */}
              </svg>
              <a href="https://instagram.com/actionsportarmenia" target="_blank" rel="noopener noreferrer" aria-label="Instagram Action Sport Armenia" className="hover:text-white">
                @actionsportarmenia
              </a>
            </div>
            {/* Email */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m0 8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8z" />
              </svg>
              <a href="mailto:info@boardshop.ru" className="hover:text-white" aria-label="Email Boardshop">
                info@boardshop.ru
              </a>
            </div>
            {/* ...остальные контакты */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

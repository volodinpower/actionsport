import React from "react";
import { getImageUrl } from "../imageUrl";

const navItems = [
  "NEW", "SNOWBOARD", "SUP", "SHOES", "BAGS", "PROTECTION", "BRANDS",
  "SALE", "SKATEBOARD", "WAKE", "CLOTHING", "ACCESSORIES", "6", "SERVICE"
];
const half = Math.ceil(navItems.length / 2);
const firstCol = navItems.slice(0, half);
const secondCol = navItems.slice(half);

const Footer = () => (
  <footer className="w-full bg-black text-white pb-6 pt-0 px-0 mt-0">
    {/* Контент футера: три колонки */}
    <div className="w-full mx-auto flex flex-col md:flex-row justify-between items-start gap-8 px-4 pt-3">
      {/* Левая колонка: контакты */}
      <div className="flex flex-col gap-1 basis-full md:basis-1/3 flex-1">
        <img
          src="/logo.png"
          alt="Boardshop Logo"
          className="h-auto w-[150px] invert mb-1"
          style={{ maxWidth: 160 }}
        />
        <div className="flex flex-col gap-[2px] text-[11px] text-gray-300">
          {/* Адрес */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>Armenia, Yerevan, Nalbandyan str. 9, 0010</span>
          </div>
          {/* Время работы */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
            </svg>
            <span>11:00-20:00, Monday closed</span>
          </div>
          {/* Instagram */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m0 8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8z" />
            </svg>
            <a href="https://instagram.com/actionsportarmenia" target="_blank" rel="noopener noreferrer" className="hover:text-white">@actionsportarmenia</a>
          </div>
          {/* Facebook */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 5 3.66 9.13 8.44 9.88v-6.99h-2.54V12h2.54V9.75c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.23.19 2.23.19v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 17 22 12"/>
            </svg>
            <a href="https://facebook.com/boardshop" target="_blank" rel="noopener noreferrer" className="hover:text-white">facebook.com/boardshop</a>
          </div>
          {/* Email */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v6a2 2 0 002 2h6" />
            </svg>
            <a href="mailto:info@boardshop.ru" className="hover:text-white">info@boardshop.ru</a>
          </div>
          {/* Телефон */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a2 2 0 011.57.78l1.7 2.34a2 2 0 001.58.78H21a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
            <a href="tel:+79000000000" className="hover:text-white">+7 900 000-00-00</a>
          </div>
          {/* Копирайт */}
          <div className="pt-4 text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} Action Sport. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

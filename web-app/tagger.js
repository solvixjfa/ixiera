/*
================================================================
SKRIP PENANDA OTOMATIS (TAGGER) - FINAL FIX
================================================================
Perbaikan: Mengubah cara import 'cheerio' agar sesuai standar.
Ini adalah versi yang sudah diuji dan benar.
================================================================
*/

import fs from 'fs-extra';
// PERUBAHAN 1: Cara import diubah
import { load } from 'cheerio';
import path from 'path';

// --- KONFIGURASI (Tetap Sama) ---
const htmlFiles = [
    'index.html', 'about.html', 'services.html', 'portfolio.html',
    'pricing.html', 'blog.html', 'team.html', 'services-details.html',
    'portfolio-details.html', 'blog-details.html', 'contact.html'
];
const tagsToTranslate = ['h1', 'h2', 'h3', 'h4', 'p', 'a', 'span', 'li', 'blockquote', 'button'];
const outputJsonPath = path.join('assets', 'translations.json');
// --- AKHIR KONFIGURASI ---

async function processFiles() {
    console.log('Memulai proses penandaan otomatis...');
    let translations = {
        id: {},
        en: {}
    };

    for (const fileName of htmlFiles) {
        try {
            if (!await fs.exists(fileName)) {
                console.warn(`Peringatan: File ${fileName} tidak ditemukan, dilewati.`);
                continue;
            }

            const htmlContent = await fs.readFile(fileName, 'utf8');
            // PERUBAHAN 2: Cara memanggil diubah
            const $ = load(htmlContent);
            const pageName = fileName.replace('.html', '');

            console.log(`\nMemproses file: ${fileName}`);

            translations.id[pageName] = {};
            translations.en[pageName] = {};

            let counter = {};

            $(tagsToTranslate.join(',')).each(function () {
                const element = $(this);
                if (!element.attr('data-translate')) {
                    const text = element.text().trim();
                    if (text && !element.parents('#navmenu').length) {
                        const tagName = element.get(0).tagName;
                        counter[tagName] = (counter[tagName] || 0) + 1;
                        const key = `${pageName}_${tagName}_${counter[tagName]}`;
                        element.attr('data-translate', key);
                        translations.id[pageName][key] = text;
                        translations.en[pageName][key] = `[EN] ${text}`;
                        console.log(`  - Menandai <${tagName}> dengan kunci: ${key}`);
                    }
                }
            });

            await fs.writeFile(fileName, $.html(), 'utf8');
            console.log(`  ✔ File ${fileName} berhasil diperbarui.`);

        } catch (error) {
            console.error(`Gagal memproses file ${fileName}:`, error);
        }
    }

    translations.id.nav = {
        home: "Home", about: "About", services: "Services", showcase: "Showcase",
        pricing: "Pricing", blog: "Blog", more: "More", ai_assistant: "AI Assistant",
        service_details: "Service Details", showcase_details: "Showcase Details",
        blog_details: "Blog Details", contact: "Contact", dashboard_button: "Go to Dashboard"
    };
    translations.en.nav = {
        home: "Home", about: "About", services: "Services", showcase: "Showcase",
        pricing: "Pricing", blog: "Blog", more: "More", ai_assistant: "AI Assistant",
        service_details: "Service Details", showcase_details: "Showcase Details",
        blog_details: "Blog Details", contact: "Contact", dashboard_button: "Go to Dashboard"
    };
    console.log('\n✔ Bagian navigasi ditambahkan.');

    await fs.ensureDir(path.dirname(outputJsonPath));
    await fs.writeJson(outputJsonPath, translations, { spaces: 2 });
    console.log(`\n🎉 Proses selesai! File terjemahan telah dibuat di: ${outputJsonPath}`);
}

processFiles();


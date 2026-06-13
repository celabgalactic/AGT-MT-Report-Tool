/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, ChangeEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  FileText, 
  Download, 
  Settings, 
  Database, 
  AlertCircle, 
  ChevronRight, 
  Table, 
  Columns,
  RefreshCw,
  Info,
  Volume2,
  VolumeX,
  Globe,
  Sliders,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CIVILIZATIONS, GALAXIES } from './constants';
// @ts-ignore
import regionsIcon from './multi-tools-icon.png';

const getColumnLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

const getColLabel = (colIdx: number, headerRow: string[] | undefined): string => {
  const letter = getColumnLetter(colIdx);
  const headerName = headerRow && headerRow[colIdx] ? headerRow[colIdx].trim() : '';
  return headerName ? `[${letter}] ${headerName}` : `[${letter}] Column ${letter}`;
};

const DETAILED_COL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 34, 35];

const findHeaderRowIndex = (rawRows: string[][]): number => {
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const row = rawRows[i];
    if (row && row.some(cell => {
      const c = String(cell).toLowerCase();
      return c.includes('galaxy') || c.includes('name') || c.includes('region') || c.includes('class');
    })) {
      return i;
    }
  }
  return 0; // Default fallback to first row
};

// Column configuration mapping
interface ColumnConfig {
  name: string;
  enabled: boolean;
}

interface TranslationDict {
  [key: string]: {
    en: string;
    fr: string;
    es: string;
    de: string;
    pt: string;
    th: string;
    hi: string;
    ja: string;
    zh: string;
    it?: string;
  };
}

const TRANSLATIONS: TranslationDict = {
  // Navigation / Title
  "Alliance of Galactic Travellers": {
    en: "Alliance of Galactic Travellers",
    fr: "Alliance des Voyageurs Galactiques",
    es: "Alianza de Viajeros Galácticos",
    de: "Allianz der galaktischen Reisenden",
    pt: "Aliança de Viajantes Galácticos",
    th: "พันธมิตรนักเดินทางแห่งกาแล็กซี",
    hi: "गैलेक्टic यात्रियों का गठबंधन",
    ja: "銀河旅行者同盟",
    zh: "星际旅行者联盟",
    it: "Alleanza dei Viaggiatori Galattici"
  },
  "AGT Region Report Tool": {
    en: "AGT Region Report Tool",
    fr: "Outil de Rapport de Région AGT",
    es: "Herramienta de Informe de Región de AGT",
    de: "AGT-Regionsbericht-Tool",
    pt: "Ferramenta de Relatório de Região AGT",
    th: "เครื่องมือรายงานภูมิภาค AGT",
    hi: "AGT क्षेत्र रिपोर्ट उपकरण",
    ja: "AGT リージョンレポートツール",
    zh: "AGT 区域报告工具",
    it: "Strumento di Rapporto della Regione AGT"
  },
  "Traveller Name": {
    en: "Traveller Name",
    fr: "Nom du Voyageur",
    es: "Nombre del Viajero",
    de: "Name des Reisenden",
    pt: "Nome do Viajante",
    th: "ชื่อผู้เดินทาง",
    hi: "यात्री का नाम",
    ja: "トラベラー名",
    zh: "旅人姓名",
    it: "Nome del Viaggiatore"
  },
  "AGT Traveller ID": {
    en: "AGT Traveller ID",
    fr: "Identifiant du Voyageur AGT",
    es: "ID de Viajero AGT",
    de: "AGT-Reisenden-ID",
    pt: "ID do Viajante AGT",
    th: "ID ผู้เดินทาง AGT",
    hi: "AGT यात्री आईडी",
    ja: "AGT トラベラーID",
    zh: "AGT 旅人ID",
    it: "Identificativo Viaggiatore AGT"
  },
  "Verify Traveller ID": {
    en: "Verify Traveller ID",
    fr: "Vérifier l'ID du Voyageur",
    es: "Verificar ID del Viajero",
    de: "Reisenden-ID verifizieren",
    pt: "Verificar ID do Viajante",
    th: "ตรวจสอบ ID ผู้เดินทาง",
    hi: "यात्री आईडी सत्यापित करें",
    ja: "トラベラーIDを確認",
    zh: "验证旅人ID",
    it: "Verifica Identificativo Viaggiatore"
  },
  "Traveller Name and ID and does not match, Please consult ": {
    en: "Traveller Name and ID and does not match, Please consult ",
    fr: "Le nom et l'identifiants du voyageur ne correspondent pas, veuillez consulter ",
    es: "El nombre y la identificación del viajero no coinciden, consulte ",
    de: "Name und ID des Reisenden stimmen nicht überein. Bitte konsultieren Sie ",
    pt: "O nome e a identificação do viajante não coincidem, consulte ",
    th: "ชื่อผู้เดินทางและ ID ไม่ตรงกัน โปรดปรึกษา ",
    hi: "यात्री का नाम और आईडी मेल नहीं खाते हैं, कृपया परामर्श लें ",
    ja: "トラベラー名とIDが一致しません。以下をご参照ください： ",
    zh: "旅人姓名与ID不匹配，请咨询 ",
    it: "Il nome e l'identificativo del viaggiatore non corrispondono, si prega di consultare "
  },
  " Your Authorization level does not provide access. If you have questions contact ": {
    en: " Your Authorization level does not provide access. If you have questions contact ",
    fr: " Votre niveau d'autorisation ne permet pas l'accès. Si vous avez des questions, contactez ",
    es: " Su nivel de autorización no proporciona acceso. Si tiene preguntas, comuníquese con ",
    de: " Ihre Berechtigungsstufe gewährt keinen Zugriff. Bei Fragen wenden Sie sich an ",
    pt: " O seu nível de autorização não concede acesso. Se tiver dúvidas, contacte ",
    th: " ระดับการอนุญาตของคุณไม่สามารถเข้าถึงได้ หากมีคำถามโปรดติดต่อ ",
    hi: " आपका प्राधिकरण स्तर पहुंच प्रदान नहीं करता है। यदि आपके कोई प्रश्न हैं तो संपर्क करें ",
    ja: " 権限レベルがアクセスを許可していません。ご質問がある場合は以下にお問い合わせください： ",
    zh: " 您的授权级别不支持访问。如有问题，请联系 ",
    it: " Il tuo livello di autorizzazione non consente l'accesso. In caso di domande, contatta "
  },
  "STATUS:": {
    en: "STATUS:",
    fr: "STATUT :",
    es: "ESTADO:",
    de: "STATUS:",
    pt: "STATUS:",
    th: "สถานะ:",
    hi: "स्थिति:",
    ja: "ステータス:",
    zh: "状态:"
  },
  "SYNCING": {
    en: "SYNCING",
    fr: "SYNCHRONISATION",
    es: "SINCRONIZANDO",
    de: "SYNCHRONISIEREN",
    pt: "SINCRONIZANDO",
    th: "กำลังซิงค์",
    hi: "सिंक हो रहा है",
    ja: "同期中",
    zh: "同步中"
  },
  "CONNECTED": {
    en: "CONNECTED",
    fr: "CONNECTÉ",
    es: "CONECTADO",
    de: "VERBUNDEN",
    pt: "CONECTADO",
    th: "เชื่อมต่อแล้ว",
    hi: "जुड़ा हुआ",
    ja: "接続済み",
    zh: "已连接"
  },
  "DISCONNECTED": {
    en: "DISCONNECTED",
    fr: "DÉCONNECTÉ",
    es: "DESCONECTADO",
    de: "GETRENNT",
    pt: "DESCONECTADO",
    th: "ตัดการเชื่อมต่อ",
    hi: "डिस्कनेक्ट किया गया",
    ja: "切断済み",
    zh: "已断开"
  },
  "Control Settings": {
    en: "Control Settings",
    fr: "Paramètres de Contrôle",
    es: "Ajustes de Control",
    de: "Steuerungseinstellungen",
    pt: "Configurações de Controle",
    th: "การตั้งค่าควบคุม",
    hi: "नियंत्रण सेटिंग्स",
    ja: "コントロール設定",
    zh: "控制设置"
  },
  "Close": {
    en: "Close",
    fr: "Fermer",
    es: "Cerrar",
    de: "Schließen",
    pt: "Fechar",
    th: "ปิด",
    hi: "बंद करें",
    ja: "閉じる",
    zh: "关闭"
  },
  "Display Settings": {
    en: "Display Settings",
    fr: "Paramètres d'Affichage",
    es: "Ajustes de Pantalla",
    de: "Anzeigeeinstellungen",
    pt: "Configurações de Exibição",
    th: "การตั้งค่าการแสดงผล",
    hi: "प्रदर्शन सेटिंग्स",
    ja: "表示設定",
    zh: "显示设置"
  },
  "Max Records on screen": {
    en: "Max Records on screen",
    fr: "Enregistrements max à l'écran",
    es: "Registros máx. en pantalla",
    de: "Maximale Datensätze auf dem Bildschirm",
    pt: "Registros máx. na tela",
    th: "ระเบียนสูงสุดบนหน้าจอ",
    hi: "स्क्रीन पर अधिकतम रिकॉर्ड",
    ja: "画面上の最大レコード数",
    zh: "屏幕最大记录数"
  },
  "Text Scaling (Desktop Mode)": {
    en: "Text Scaling (Desktop Mode)",
    fr: "Échelle du texte (Mode Bureau)",
    es: "Escala de texto (Modo Escritorio)",
    de: "Textskalierung (Desktop-Modus)",
    pt: "Escalonamento de Texto (Modo Desktop)",
    th: "การปรับขนาดข้อความ (โหมดเดสก์ท็อป)",
    hi: "टेक्स्ट स्केलिंग (डेस्कटॉप मोड)",
    ja: "テキストの拡大縮小 (デスクトップモード)",
    zh: "文本缩放 (桌面模式)"
  },
  "1x (Default)": {
    en: "1x (Default)",
    fr: "1x (Par défaut)",
    es: "1x (Predeterminado)",
    de: "1x (Standard)",
    pt: "1x (Padrão)",
    th: "1 เท่า (เริ่มต้น)",
    hi: "1x (डिफ़ॉल्ट)",
    ja: "1倍 (デフォルト)",
    zh: "1x (默认)"
  },
  "1.5x": {
    en: "1.5x",
    fr: "1.5x",
    es: "1.5x",
    de: "1.5x",
    pt: "1.5x",
    th: "1.5 เท่า",
    hi: "1.5x",
    ja: "1.5倍",
    zh: "1.5x"
  },
  "2x": {
    en: "2x",
    fr: "2x",
    es: "2x",
    de: "2x",
    pt: "2x",
    th: "2 เท่า",
    hi: "2x",
    ja: "2倍",
    zh: "2x"
  },
  "2.5x": {
    en: "2.5x",
    fr: "2.5x",
    es: "2.5x",
    de: "2.5x",
    pt: "2.5x",
    th: "2.5 เท่า",
    hi: "2.5x",
    ja: "2.5倍",
    zh: "2.5x"
  },
  "3x": {
    en: "3x",
    fr: "3x",
    es: "3x",
    de: "3x",
    pt: "3x",
    th: "3 เท่า",
    hi: "3x",
    ja: "3倍",
    zh: "3x"
  },
  "AGT Anthem": {
    en: "AGT Anthem",
    fr: "Hymne de l'AGT",
    es: "Himno de AGT",
    de: "AGT-Hymne",
    pt: "Hino da AGT",
    th: "เพลงสรรเสริญ AGT",
    hi: "AGT गान",
    ja: "AGT 賛歌",
    zh: "AGT 颂歌"
  },
  "Active": {
    en: "Active",
    fr: "Actif",
    es: "Activo",
    de: "Aktiv",
    pt: "Ativo",
    th: "ทำงานอยู่",
    hi: "सक्रिय",
    ja: "有効",
    zh: "启用"
  },
  "Muted": {
    en: "Muted",
    fr: "Muet",
    es: "Silenciado",
    de: "Stumm",
    pt: "Mudo",
    th: "ปิดเสียง",
    hi: "म्यूट",
    ja: "静音",
    zh: "静音"
  },
  "Multi-Tool DB Sync": {
    en: "Multi-Tool DB Sync",
    fr: "Sync de la DB de Multi-Outils",
    es: "Sincronización de BD de Multiherramientas",
    de: "Multi-Tool-Datenbank-Synchronisierung",
    pt: "Sincronização de BD de Multi-ferramentas",
    th: "ซิงค์ฐานข้อมูลมัลติทูล",
    hi: "मल्टी-टูล डीबी सिंक",
    ja: "マルチツールDB同期",
    zh: "多用途工具数据库同步"
  },
  "Re-Sync Multi-Tool Data": {
    en: "Re-Sync Multi-Tool Data",
    fr: "Re-synchroniser les multi-outils",
    es: "Resincronizar Datos de Multiherramientas",
    de: "Multi-Tool-Daten neu synchronisieren",
    pt: "Re-sincronizar Dados de Multi-ferramenta",
    th: "ซิงค์ข้อมูลมัลติทูลใหม่",
    hi: "मल्टी-टูล डेटा फिर से सिंक करें",
    ja: "マルチツールデータを再同期",
    zh: "重新同步多用途工具数据"
  },
  "optional": {
    en: "optional",
    fr: "facultatif",
    es: "opcional",
    de: "optional",
    pt: "opcional",
    th: "ไม่บังคับ",
    hi: "वैकल्पिक",
    ja: "任意",
    zh: "可选"
  },
  "Simple Report": {
    en: "Simple Report",
    fr: "Rapport Simple",
    es: "Informe Simple",
    de: "Einfacher Bericht",
    pt: "Relatório Simples",
    th: "รายงานแบบง่าย",
    hi: "सरल रिपोर्ट",
    ja: "簡易レポート",
    zh: "简单报告"
  },
  "Detailed Report": {
    en: "Detailed Report",
    fr: "Rapport Détaillé",
    es: "Informe Detallado",
    de: "Detaillierter Bericht",
    pt: "Relatório Detalhado",
    th: "รายงานโดยละเอียด",
    hi: "विस्तृत रिपोर्ट",
    ja: "詳細レポート",
    zh: "详细报告"
  },
  "Custom Report": {
    en: "Custom Report",
    fr: "Rapport Personnalisé",
    es: "Informe Personalizado",
    de: "Benutzerdefinierter Bericht",
    pt: "Relatório Personalizado",
    th: "รายงานที่กำหนดเอง",
    hi: "कस्टम रिपोर्ट",
    ja: "カスタムレポート",
    zh: "自定义报告",
    it: "Rapporto Personalizzato"
  },
  "Custom Report Column Toggle": {
    en: "Custom Report Column Toggle",
    fr: "Sélection de Colonne Personnalisée",
    es: "Interruptor de Columna del Informe Personalizado",
    de: "Spaltenauswahl für benutzerdefinierten Bericht",
    pt: "Alternador de Coluna de Relatório Personalizado",
    th: "สลับคอลัมน์รายงานที่กำหนดเอง",
    hi: "कस्टम रिपोर्ट कॉलम टॉगल",
    ja: "カスタムレポート列の切り替え",
    zh: "自定义报告列切换",
    it: "Attivazione Colonne Rapporto Personalizzato"
  },
  "The name is always included.": {
    en: "The name is always included.",
    fr: "Le nom est toujours inclus.",
    es: "El nombre siempre está incluido.",
    de: "Der Name ist immer enthalten.",
    pt: "O nome está sempre incluído.",
    th: "รวมชื่อเสมอ",
    hi: "नाम हमेशा शामिल होता है।",
    ja: "名は常に含まれます。",
    zh: "名称总是包含在内。",
    it: "Il nome è sempre incluso."
  },
  "Criteria 1": {
    en: "Criteria 1",
    fr: "Critère 1",
    es: "Criterio 1",
    de: "Kriterium 1",
    pt: "Critério 1",
    th: "เกณฑ์ที่ 1",
    hi: "मानदंड 1",
    ja: "基準 1",
    zh: "标准 1"
  },
  "Select Civilization": {
    en: "Select Civilization",
    fr: "Sélectionner la Civilisation",
    es: "Seleccionar Civilización",
    de: "Zivilisation auswählen",
    pt: "Selecionar Civilização",
    th: "เลือกอารยธรรม",
    hi: "सभ्यता चुनें",
    ja: "文明を選択",
    zh: "选择文明"
  },
  "Criteria 2": {
    en: "Criteria 2",
    fr: "Critère 2",
    es: "Criterio 2",
    de: "Kriterium 2",
    pt: "Critério 2",
    th: "เกณฑ์ที่ 2",
    hi: "मानदंड 2",
    ja: "基準 2",
    zh: "标准 2"
  },
  "Preferred Galaxy": {
    en: "Preferred Galaxy",
    fr: "Galaxie Préférée",
    es: "Galaxia Preferida",
    de: "Bevorzugte Galaxie",
    pt: "Galáxia Preferida",
    th: "กาแล็กซีที่ต้องการ",
    hi: "पसंदीदा आकाशगंगा",
    ja: "好みの銀河",
    zh: "首选星系"
  },
  "Type or select civilization...": {
    en: "Type or select civilization...",
    fr: "Saisir ou choisir la civilisation...",
    es: "Escribe o elige civilización...",
    de: "Zivilisation eingeben oder auswählen...",
    pt: "Digite ou selecione a civilização...",
    th: "พิมพ์หรือเลือกอารยธรรม...",
    hi: "सभ्यता टाइप करें या चुनें...",
    ja: "文明を入力または選択...",
    zh: "输入或选择文明..."
  },
  "Type or select galaxy...": {
    en: "Type or select galaxy...",
    fr: "Saisir ou choisir la galaxie...",
    es: "Escribe o elige galaxia...",
    de: "Galaxie eingeben oder auswählen...",
    pt: "Digite ou selecione a galáxia...",
    th: "พิมพ์หรือเลือกกาแล็กซี...",
    hi: "आकाशगंगा टाइप करें या चुनें...",
    ja: "銀河を入力または選択...",
    zh: "输入或选择星系..."
  },
  "Extract Reports": {
    en: "Extract Reports",
    fr: "Extraire les Rapports",
    es: "Extraer Informes",
    de: "Berichte extrahieren",
    pt: "Extrair Relatórios",
    th: "ดึงรายงาน",
    hi: "रिपोर्ट निकालें",
    ja: "レポートを抽出",
    zh: "提取报告"
  },
  "Processing Galactic Archive...": {
    en: "Processing Galactic Archive...",
    fr: "Traitement de l'Archive Galactique...",
    es: "Procesando Archivo Galáctico...",
    de: "Galaktisches Archiv wird verarbeitet...",
    pt: "Processando Arquivo Galáctico...",
    th: "กำลังประมวลผลคลังข้อมูลกาแล็กซี...",
    hi: "गैलेक्टिक आर्काइव को संसाधित किया जा रहा है...",
    ja: "銀河アーカイブを処理中...",
    zh: "正在处理星际档案..."
  },
  "Terminal Ready": {
    en: "Terminal Ready",
    fr: "Terminal Prêt",
    es: "Terminal Listo",
    de: "Terminal bereit",
    pt: "Terminal Pronto",
    th: "เทอร์มินัลพร้อม",
    hi: "टर्मिनल तैयार",
    ja: "端末準備完了",
    zh: "终端就绪"
  },
  "Report Generation Sequence Pending Civilization Selection": {
    en: "Report Generation Sequence Pending Civilization Selection",
    fr: "Génération de rapport en attente de la sélection de la civilisation",
    es: "Secuencia de Generación de Informe Pendiente de Selección de Civilización",
    de: "Berichtsgenerierungssequenz wartet auf Zivilisationsauswahl",
    pt: "Sequência de Geração de Relatório Pendente de Seleção de Civilização",
    th: "ลำดับการสร้างรายงานอยู่ระหว่างรอการเลือกอารยธรรม",
    hi: "सभ्यता चयन की प्रतीक्षा में रिपोर्ट पीढ़ी अनुक्रम लंबित है",
    ja: "文明の選択待ちのためレポート生成シーケンスは保留中",
    zh: "报告生成序列正等待文明选择"
  },
  "AGT Galactic Archives Results": {
    en: "AGT Galactic Archives Results",
    fr: "Résultats des Archives Galactiques AGT",
    es: "Resultados de Archivos Galácticos de AGT",
    de: "Ergebnisse der galaktischen Archive der AGT",
    pt: "Resultados dos Arquivos Galácticos da AGT",
    th: "ผลลัพธ์คลังข้อมูลกาแล็กซี AGT",
    hi: "AGT गैलेक्टिक आर्काइव परिणाम",
    ja: "AGT 銀河アーカイブ結果",
    zh: "AGT 星际档案结果"
  },
  "FOUND": {
    en: "FOUND",
    fr: "TROUVÉS",
    es: "ENCONTRADOS",
    de: "GEFUNDEN",
    pt: "ENCONTRADOS",
    th: "พบ",
    hi: "मिला",
    ja: "検出",
    zh: "找到"
  },
  "Verified Galactic Ledger Matches": {
    en: "Verified Galactic Ledger Matches",
    fr: "Correspondances du Grand Livre Galactique Vérifiées",
    es: "Coincidencias de Registro Galáctico Verificadas",
    de: "Verifizierte galaktische Hauptbuch-Übereinstimmungen",
    pt: "Correspondências de Livro Razão Galáctico Verificadas",
    th: "ตรวจสอบรายการที่ตรงกันของบัญชีแยกประเภทกาแล็กซีแล้ว",
    hi: "सत्यापित गैलेक्टिक लेजर मिलान",
    ja: "検証された銀河台帳の一致",
    zh: "已验证的星际账本匹配项"
  },
  "Export PDF": {
    en: "Export PDF",
    fr: "Exporter en PDF",
    es: "Exportar PDF",
    de: "PDF exportieren",
    pt: "Exportar PDF",
    th: "ส่งออก PDF",
    hi: "पीडीएफ निर्यात करें",
    ja: "PDF出力",
    zh: "导出 PDF"
  },
  "Export CSV": {
    en: "Export CSV",
    fr: "Exporter en CSV",
    es: "Exportar CSV",
    de: "CSV exportieren",
    pt: "Exportar CSV",
    th: "ส่งออก CSV",
    hi: "सीएसवी निर्यात करें",
    ja: "CSV出力",
    zh: "导出 CSV"
  },
  "TOTAL:": {
    en: "TOTAL:",
    fr: "TOTAL :",
    es: "TOTAL:",
    de: "GESAMT:",
    pt: "TOTAL:",
    th: "รวมทั้งหมด:",
    hi: "कुल:",
    ja: "合計:",
    zh: "总计:"
  },
  "Number of Multi-Tools": {
    en: "Number of Multi-Tools",
    fr: "Nombre de Multi-outils",
    es: "Número de Multiherramientas",
    de: "Anzahl der Multi-Tools",
    pt: "Número de Multi-ferramentas",
    th: "จำนวนมัลติทูล",
    hi: "मल्टी-टूल्स की संख्या",
    ja: "マルチツール数",
    zh: "多用途工具数"
  },
  "Number of Multi-tools": {
    en: "Number of Multi-tools",
    fr: "Nombre de Multi-outils",
    es: "Número de Multiherramientas",
    de: "Anzahl der Multi-Tools",
    pt: "Número de Multi-ferramentas",
    th: "จำนวนมัลติทูล",
    hi: "मल्टी-टूल्स की संख्या",
    ja: "マルチツール数",
    zh: "多用途工具数"
  },
  "Showing Page": {
    en: "Showing Page",
    fr: "Affichage de la page",
    es: "Mostrando Página",
    de: "Zeige Seite",
    pt: "Mostrando Página",
    th: "แสดงหน้า",
    hi: "पृष्ठ दिखा रहा है",
    ja: "ページ表示",
    zh: "显示第"
  },
  "of": {
    en: "of",
    fr: "sur",
    es: "de",
    de: "von",
    pt: "de",
    th: "จาก",
    hi: "का",
    ja: " / ",
    zh: "页，共"
  },
  "total rows": {
    en: "total rows",
    fr: "lignes au total",
    es: "filas totales",
    de: "Zeilen insgesamt",
    pt: "linhas no total",
    th: "แถวทั้งหมด",
    hi: "कुल पंक्तियाँ",
    ja: "総行数",
    zh: "行记录"
  },
  "First": {
    en: "First",
    fr: "Premier",
    es: "Primero",
    de: "Erste",
    pt: "Primeiro",
    th: "หน้าแรก",
    hi: "पहला",
    ja: "最初",
    zh: "第一页"
  },
  "Prev": {
    en: "Prev",
    fr: "Préc",
    es: "Ant",
    de: "Zurück",
    pt: "Anterior",
    th: "ก่อนหน้า",
    hi: "पिछला",
    ja: "前へ",
    zh: "上一页"
  },
  "Next": {
    en: "Next",
    fr: "Suiv",
    es: "Sig",
    de: "Weiter",
    pt: "Próximo",
    th: "ถัดไป",
    hi: "अगला",
    ja: "次へ",
    zh: "下一页"
  },
  "Last": {
    en: "Last",
    fr: "Dernier",
    es: "Último",
    de: "Letzte",
    pt: "Último",
    th: "หน้าสุดท้าย",
    hi: "अंतिम",
    ja: "最後",
    zh: "最后一页"
  },
  "Ledger Integrity: Verified": {
    en: "Ledger Integrity: Verified",
    fr: "Intégrité du Grand Livre : Vérifiée",
    es: "Integridad de Registro: Verificada",
    de: "Hauptbuchintegrität: Verifiziert",
    pt: "Integridade do Livro Razão: Verificada",
    th: "ความสมบูรณ์ของบัญชีแยกประเภท: ตรวจสอบแล้ว",
    hi: "लेजर अखंडता: सत्यापित",
    ja: "台帳データ整合性: 検証済み",
    zh: "账本完整性：已验证"
  },
  "Index Reference:": {
    en: "Index Reference:",
    fr: "Référence d'Index :",
    es: "Referencia de Índice:",
    de: "Indexreferenz:",
    pt: "Referência de Índice:",
    th: "การอ้างอิงดัชนี:",
    hi: "अनुक्रमणिका संदर्भ:",
    ja: "インデックス参照:",
    zh: "索引主键："
  },
  "AGT SECURE ARCHIVE CLIENT": {
    en: "AGT SECURE ARCHIVE CLIENT",
    fr: "CLIENT D'ARCHIVES SÉCURISÉES AGT",
    es: "CLIENTE DE ARCHIVO SEGURO DE AGT",
    de: "AGT SICHERER ARCHIV-CLIENT",
    pt: "CLIENTE DE ARQUIVO SEGURO DA AGT",
    th: "ไคลเอนต์จัดเก็บข้อมูลที่ปลอดภัยของ AGT",
    hi: "AGT सुरक्षित आर्काइव क्लाइंट",
    ja: "AGT セキュアアーカイブクライアント",
    zh: "AGT 安全档案客户端"
  },
  "Select Language": {
    en: "Select Language",
    fr: "Choisir la Langue",
    es: "Seleccionar Idioma",
    de: "Sprache auswählen",
    pt: "Selecionar Idioma",
    th: "เลือกภาษา",
    hi: "भाषा चुनें",
    ja: "言語を選択",
    zh: "选择语言",
    it: "Seleziona Lingua"
  },
  "Show All": {
    en: "Show All",
    fr: "Tout Afficher",
    es: "Mostrar Todo",
    de: "Alle anzeigen",
    pt: "Mostrar Tudo",
    th: "แสดงทั้งหมด",
    hi: "सभी दिखाएं",
    ja: "すべて表示",
    zh: "显示全部"
  },
  "Region Name": {
    en: "Region Name",
    fr: "Nom de la Région",
    es: "Nombre de la Región",
    de: "Regionsname",
    pt: "Nome da Região",
    th: "ชื่อภูมิภาค",
    hi: "क्षेत्र का नाम",
    ja: "リージョン名",
    zh: "区域名称"
  },
  "Galaxy": {
    en: "Galaxy",
    fr: "Galaxie",
    es: "Galaxia",
    de: "Galaxie",
    pt: "Galáxia",
    th: "กาแล็กซี",
    hi: "आकाशगंगा",
    ja: "銀河",
    zh: "星系"
  },
  "Civilization": {
    en: "Civilization",
    fr: "Civilisation",
    es: "Civilización",
    de: "Zivilisation",
    pt: "Civilização",
    th: "อารยธรรม",
    hi: "สभ्यता",
    ja: "文明",
    zh: "文明"
  },
  "Platform": {
    en: "Platform",
    fr: "Plateforme",
    es: "Plataforma",
    de: "Plattform",
    pt: "Plataforma",
    th: "แพลตฟอร์ม",
    hi: "प्लेटफ़ॉर्म",
    ja: "プラットフォーム",
    zh: "平台"
  },
  "Points": {
    en: "Points",
    fr: "Points",
    es: "Puntos",
    de: "Punkte",
    pt: "Pontos",
    th: "คะแนน",
    hi: "अंक",
    ja: "ポイント",
    zh: "积分"
  },
  "NMS Wiki Link": {
    en: "NMS Wiki Link",
    fr: "Lien Wiki NMS",
    es: "Enlace de Wiki de NMS",
    de: "NMS-Wiki-Link",
    pt: "Link da Wiki do NMS",
    th: "ลิงก์ NMS Wiki",
    hi: "NMS विकी लिंक",
    ja: "NMS Wikiリンク",
    zh: "NMS百科链接"
  },
  "15 Records": {
    en: "15 Records",
    fr: "15 Enregistrements",
    es: "15 Registros",
    de: "15 Datensätze",
    pt: "15 Registros",
    th: "15 ระเบียน",
    hi: "15 रिकॉर्ड",
    ja: "15レコード",
    zh: "15 条记录"
  },
  "30 Records": {
    en: "30 Records",
    fr: "30 Enregistrements",
    es: "30 Registros",
    de: "30 Datensätze",
    pt: "30 Registros",
    th: "30 ระเบียน",
    hi: "30 रिकॉर्ड",
    ja: "30レコード",
    zh: "30 条记录"
  },
  "50 Records": {
    en: "50 Records",
    fr: "50 Enregistrements",
    es: "50 Registros",
    de: "50 Datensätze",
    pt: "50 Registros",
    th: "50 ระเบียน",
    hi: "50 रिकॉर्ड",
    ja: "50レコード",
    zh: "50 条记录"
  },
  "100 Records": {
    en: "100 Records",
    fr: "100 Enregistrements",
    es: "100 Registros",
    de: "100 Datensätze",
    pt: "100 Registros",
    th: "100 ระเบียน",
    hi: "100 रिकॉर्ड",
    ja: "100レコード",
    zh: "100 条记录"
  },
  "Home": {
    en: "Home",
    fr: "Accueil",
    es: "Inicio",
    de: "Startseite",
    pt: "Início",
    th: "หน้าแรก",
    hi: "पहला",
    ja: "最初",
    zh: "首页"
  },
  "About": {
    en: "About",
    fr: "À propos",
    es: "Acerca de",
    de: "Über uns",
    pt: "Sobre",
    th: "เกี่ยวกับ",
    hi: "के बारे में",
    ja: "概要",
    zh: "关于"
  },
  "Team": {
    en: "Team",
    fr: "Équipe",
    es: "Equipo",
    de: "Team",
    pt: "Equipe",
    th: "ทีมงาน",
    hi: "टीम",
    ja: "チーム",
    zh: "团队"
  },
  "Contribute": {
    en: "Contribute",
    fr: "Contribuer",
    es: "Contribuir",
    de: "Beitragen",
    pt: "Contribuir",
    th: "สนับสนุน",
    hi: "योगदान दें",
    ja: "貢献",
    zh: "贡献"
  },
  "Galactic Archives": {
    en: "Galactic Archives",
    fr: "Archives Galactiques",
    es: "Archivos Galácticos",
    de: "Galaktische Archive",
    pt: "Arquivos Galácticos",
    th: "คลังข้อมูลกาแล็กซี",
    hi: "गैलेक्टिक आर्कायव्स",
    ja: "銀河アーカイブ",
    zh: "星系档案"
  },
  "Engage": {
    en: "Engage",
    fr: "S'engager",
    es: "Participar",
    de: "Beteiligen",
    pt: "Engajar",
    th: "เข้าร่วม",
    hi: "जुड़ें",
    ja: "参加",
    zh: "参与"
  },
  "Support": {
    en: "Support",
    fr: "Support",
    es: "Soporte",
    de: "Support",
    pt: "Suporte",
    th: "ช่วยเหลือ",
    hi: "समर्थन",
    ja: "サポート",
    zh: "支持"
  },
  "Terms": {
    en: "Terms",
    fr: "Conditions",
    es: "Términos",
    de: "Bedingungen",
    pt: "Termos",
    th: "ข้อตกลง",
    hi: "शर्तें",
    ja: "利用規約",
    zh: "条款"
  },
  "Copyright": {
    en: "Copyright",
    fr: "Droit d'auteur",
    es: "Derechos de autor",
    de: "Copyright",
    pt: "Copyright",
    th: "ลิขสิทธิ์",
    hi: "कॉपीराइट",
    ja: "著作権",
    zh: "版权"
  },
  "Reset Fields": {
    en: "Reset Fields",
    fr: "Réinitialiser",
    es: "Restablecer Campos",
    de: "Felder zurücksetzen",
    pt: "Redefinir Campos",
    th: "ล้างข้อมูล",
    hi: "क्षेत्र रीसेट करें",
    ja: "フィールドをリセット",
    zh: "重置表单"
  }
};

// Column configuration mapping
interface ColumnConfig {
  name: string;
  enabled: boolean;
}

const setCookie = (name: string, value: string, days?: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/; SameSite=Lax; Secure";
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};

const eraseCookie = (name: string) => {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure';
};

const getSecurityLevel = (classification: string | undefined): number => {
  if (!classification) return 0;
  const clean = String(classification).trim().toLowerCase();
  if (clean === 'private') return 1;
  if (clean === 'restricted') return 2;
  if (clean === 'top secret') return 3;
  if (clean === 'slt restricted') return 4;
  if (clean === 'scc restricted') return 5;
  return 0; // default is Public
};

export default function App() {
  const [savedTravellerName, setSavedTravellerName] = useState<string>(() => getCookie('agt_traveller_name') || '');
  const [savedTravellerId, setSavedTravellerId] = useState<string>(() => getCookie('agt_traveller_id') || '');
  const [savedSecurityLevel, setSavedSecurityLevel] = useState<number>(() => {
    const l = getCookie('agt_security_level');
    return l ? parseFloat(l) : 0;
  });

  const [settingsTravellerName, setSettingsTravellerName] = useState('');
  const [settingsTravellerId, setSettingsTravellerId] = useState('');
  const [isSettingsVerifying, setIsSettingsVerifying] = useState(false);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem('sheet_reporter_url');
    const oldDefault = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSWiJE26JMTHgjGeZfpfTrwT1HL2ZnXIqiOVkNs-V8wtDkGE7ey0Q9hnAM-bpMhy475q45qHa09o2vC/pub?gid=0&single=true&output=csv';
    const oldDefault2 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0jFq80ut0o5jtApdhRG8sR2CIufVn0FNcugR_7fdCIfrDRfgB9s-SvEhBAePrQCibr1RcxFVoXj7o/pub?gid=354119689&single=true&output=tsv';
    const newDefault = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0jFq80ut0o5jtApdhRG8sR2CIufVn0FNcugR_7fdCIfrDRfgB9s-SvEhBAePrQCibr1RcxFVoXj7o/pub?gid=1768454634&single=true&output=tsv';
    
    if (!saved || saved === oldDefault || saved === oldDefault2) return newDefault;
    return saved;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [travellerName, setTravellerName] = useState('');
  const [travellerId, setTravellerId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<ReactNode | null>(null);
  const [textScale, setTextScale] = useState<string>(() => {
    return localStorage.getItem('agt_text_scale') || '1';
  });
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('agt_audio_enabled');
    return saved === 'true'; // Default to false (muted) unless explicitly saved as 'true'
  });
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (showSettings) {
      setSettingsTravellerName(savedTravellerName);
      setSettingsTravellerId(savedTravellerId);
    }
  }, [showSettings, savedTravellerName, savedTravellerId]);

  // Initial fetch and manual font loading
  useEffect(() => {
    if (sheetUrl) {
      fetchData();
    }

    // Manual font loading reinforcement with local font
    const font = new FontFace('Geonms', 'url(/NMSFuturaProBook_Kerned.ttf)');
    font.load().then((loadedFont) => {
      // @ts-ignore
      document.fonts.add(loadedFont);
      document.documentElement.style.fontFamily = '"Geonms", "Inter", sans-serif';
    }).catch(err => {
      console.warn('Geonms font load failed, falling back to Inter:', err);
    });
  }, []);

  // Background Audio Management
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioEnabled && audioRef.current) {
        audioRef.current.volume = 0.4;
        audioRef.current.play().catch(() => {});
      }
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('mousedown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [audioEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      if (audioEnabled) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
    localStorage.setItem('agt_audio_enabled', String(audioEnabled));
  }, [audioEnabled]);

  const handleManualPlay = () => {
    if (audioEnabled && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  const [language, setLanguage] = useState<'en' | 'fr' | 'es' | 'de' | 'pt' | 'th' | 'zh' | 'hi' | 'ja' | 'it'>(() => {
    let saved = localStorage.getItem('agt_language') as any;
    if (saved === 'ru') saved = 'th';
    return saved || 'en';
  });

  const t = (key: string): string => {
    const normalizedKey = key.trim();
    const entry = TRANSLATIONS[normalizedKey];
    if (entry && entry[language]) {
      return entry[language]!;
    }
    // Try case-insensitive lookup
    for (const k of Object.keys(TRANSLATIONS)) {
      if (k.toLowerCase() === normalizedKey.toLowerCase()) {
        const val = TRANSLATIONS[k][language];
        if (val) return val;
      }
    }
    return key;
  };

  // 7 filter criteria variables
  const [filterCivilization, setFilterCivilization] = useState('All');
  const [filterGalaxy, setFilterGalaxy] = useState('All');
  const [omitPublicRecords, setOmitPublicRecords] = useState(false);
  const [omitPrivateRecords, setOmitPrivateRecords] = useState(false);
  const [filterRegion, setFilterRegion] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [filterDiscoverer, setFilterDiscoverer] = useState('');

  // Dropdown UI states
  const [isCivDropdownOpen, setIsCivDropdownOpen] = useState(false);
  const [activeCivIndex, setActiveCivIndex] = useState(0);
  const civAutocompleteRef = useRef<HTMLDivElement>(null);

  const [isGalaxyDropdownOpen, setIsGalaxyDropdownOpen] = useState(false);
  const [activeGalaxyIndex, setActiveGalaxyIndex] = useState(0);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const regionAutocompleteRef = useRef<HTMLDivElement>(null);

  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const [activeSystemIndex, setActiveSystemIndex] = useState(0);
  const systemAutocompleteRef = useRef<HTMLDivElement>(null);

  const [isDiscovererDropdownOpen, setIsDiscovererDropdownOpen] = useState(false);
  const [activeDiscovererIndex, setActiveDiscovererIndex] = useState(0);
  const discovererAutocompleteRef = useRef<HTMLDivElement>(null);

  // Dynamic values parsed from database for dropdown options
  const [reportType, setReportType] = useState<'Simple' | 'Detailed' | 'Custom'>('Simple');
  const [customToggles, setCustomToggles] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('agt_custom_toggles');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    
    const initial: Record<number, boolean> = {};
    const targetIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 34, 35];
    targetIndices.forEach(idx => {
      initial[idx] = true;
    });
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('agt_custom_toggles', JSON.stringify(customToggles));
  }, [customToggles]);
  const [allRawRows, setAllRawRows] = useState<string[][]>([]);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedRecords, setMatchedRecords] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Synchronized Top Horizontal Scrollbar Hooks & Refs
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleTopScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      if (bottomScrollRef.current.scrollLeft !== topScrollRef.current.scrollLeft) {
        bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      }
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      if (topScrollRef.current.scrollLeft !== bottomScrollRef.current.scrollLeft) {
        topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
      }
    }
  };

  useEffect(() => {
    if (!bottomScrollRef.current || !tableRef.current) return;

    const bottomEl = bottomScrollRef.current;
    const tableEl = tableRef.current;

    const updateDimensions = () => {
      setTableScrollWidth(tableEl.offsetWidth);
      setContainerWidth(bottomEl.clientWidth);
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    observer.observe(bottomEl);
    observer.observe(tableEl);

    return () => {
      observer.disconnect();
    };
  }, [matchedRecords, columns, currentPage]);

  // Compute unique dropdown values dynamically based on loaded data
  const civilizationOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Civilization"]).filter(Boolean))) as string[];
    const merged = Array.from(new Set([...list, ...CIVILIZATIONS])).sort();
    return ['All', ...merged];
  }, [data]);

  const galaxyOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Galaxy"]).filter(Boolean))) as string[];
    const merged = Array.from(new Set([...list, ...GALAXIES])).sort();
    return ['All', ...merged];
  }, [data]);

  const regionOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Region"]).filter(Boolean))).sort() as string[];
    return ['All', ...list];
  }, [data]);

  const systemOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Star System"]).filter(Boolean))).sort() as string[];
    return ['All', ...list];
  }, [data]);

  const typeOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Type"]).filter(Boolean))).sort() as string[];
    return ['All', ...list];
  }, [data]);

  const classOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Class"]).filter(Boolean))).sort() as string[];
    const standard = ["S", "A", "B", "C"];
    const merged = Array.from(new Set([...standard, ...list])).filter(Boolean).sort();
    return ['All', ...merged];
  }, [data]);

  const discovererOptions = useMemo(() => {
    const list = Array.from(new Set(data.map(item => item["Discoverer"]).filter(Boolean))).sort() as string[];
    return ['All', ...list];
  }, [data]);

  // Autocomplete auto-filtering matching input keys
  const filteredCivilizations = useMemo(() => {
    const inputVal = filterCivilization.trim().toLowerCase();
    if (!inputVal || inputVal === 'all') {
      return civilizationOptions.slice(0, 50);
    }
    const filtered = civilizationOptions.filter(civ => civ.toLowerCase().includes(inputVal));
    return filtered.slice(0, 50);
  }, [civilizationOptions, filterCivilization]);

  const filteredGalaxies = useMemo(() => {
    const inputVal = filterGalaxy.trim().toLowerCase();
    if (!inputVal || inputVal === 'all') {
      return galaxyOptions.slice(0, 50);
    }
    const filtered = galaxyOptions.filter(gal => gal.toLowerCase().includes(inputVal));
    return filtered.slice(0, 50);
  }, [galaxyOptions, filterGalaxy]);

  const filteredRegions = useMemo(() => {
    const inputVal = filterRegion.trim().toLowerCase();
    if (!inputVal || inputVal === 'all') {
      return regionOptions.slice(0, 50);
    }
    const filtered = regionOptions.filter(reg => reg.toLowerCase().includes(inputVal));
    return filtered.slice(0, 50);
  }, [regionOptions, filterRegion]);

  const filteredSystems = useMemo(() => {
    const inputVal = filterSystem.trim().toLowerCase();
    if (!inputVal || inputVal === 'all') {
      return systemOptions.slice(0, 50);
    }
    const filtered = systemOptions.filter(sys => sys.toLowerCase().includes(inputVal));
    return filtered.slice(0, 50);
  }, [systemOptions, filterSystem]);

  const filteredDiscoverers = useMemo(() => {
    const inputVal = filterDiscoverer.trim().toLowerCase();
    if (!inputVal || inputVal === 'all') {
      return discovererOptions.slice(0, 50);
    }
    const filtered = discovererOptions.filter(disc => disc.toLowerCase().includes(inputVal));
    return filtered.slice(0, 50);
  }, [discovererOptions, filterDiscoverer]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setIsGalaxyDropdownOpen(false);
      }
      if (civAutocompleteRef.current && !civAutocompleteRef.current.contains(e.target as Node)) {
        setIsCivDropdownOpen(false);
      }
      if (regionAutocompleteRef.current && !regionAutocompleteRef.current.contains(e.target as Node)) {
        setIsRegionDropdownOpen(false);
      }
      if (systemAutocompleteRef.current && !systemAutocompleteRef.current.contains(e.target as Node)) {
        setIsSystemDropdownOpen(false);
      }
      if (discovererAutocompleteRef.current && !discovererAutocompleteRef.current.contains(e.target as Node)) {
        setIsDiscovererDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset to first page when search filters or matches change
  useEffect(() => {
    setCurrentPage(1);
  }, [matchedRecords]);

  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const totalPages = Math.ceil(matchedRecords.length / itemsPerPage);

  const sortedAndMatchedRecords = useMemo(() => {
    if (!sortColumn) return matchedRecords;
    return [...matchedRecords].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      
      // Attempt numerical comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      
      const strA = String(valA || '').trim().toLowerCase();
      const strB = String(valB || '').trim().toLowerCase();
      
      if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [matchedRecords, sortColumn, sortDirection]);

  const omittedCount = useMemo(() => {
    let termCiv = filterCivilization.trim().toLowerCase();
    let termGal = filterGalaxy.trim().toLowerCase();
    let termReg = filterRegion.trim().toLowerCase();
    let termSys = filterSystem.trim().toLowerCase();
    let termType = filterType.trim().toLowerCase();
    let termClass = filterClass.trim().toLowerCase();
    let termDisc = filterDiscoverer.trim().toLowerCase();

    if (termCiv === 'agt') {
      termCiv = 'alliance of galactic travellers';
    }

    const maxAllowedSecurity = savedSecurityLevel || 0;

    return data.filter(row => {
      const rowCiv = String(row["Civilization"] || '').toLowerCase();
      const rowGal = String(row["Galaxy"] || '').toLowerCase();
      const rowReg = String(row["Region"] || '').toLowerCase();
      const rowSys = String(row["Star System"] || '').toLowerCase();
      const rowType = String(row["Type"] || '').toLowerCase();
      const rowClass = String(row["Class"] || '').toLowerCase();
      const rowDisc = String(row["Discoverer"] || '').toLowerCase();

      // If filter is "All", empty, or a match
      const civMatch = termCiv === 'all' || !termCiv || rowCiv.includes(termCiv);
      const galMatch = termGal === 'all' || !termGal || rowGal.includes(termGal);
      const regMatch = termReg === 'all' || !termReg || rowReg.includes(termReg);
      const sysMatch = termSys === 'all' || !termSys || rowSys.includes(termSys);
      const typeMatch = termType === 'all' || !termType || rowType.includes(termType);
      const classMatch = termClass === 'all' || !termClass || rowClass === termClass;
      const discMatch = termDisc === 'all' || !termDisc || rowDisc.includes(termDisc);

      const matchesFilters = civMatch && galMatch && regMatch && sysMatch && typeMatch && classMatch && discMatch;
      if (!matchesFilters) return false;

      const rowSecurity = getSecurityLevel(row["AK"]);
      
      // Let's see: what triggers an omission?
      // Normally, it's rowSecurity > maxAllowedSecurity.
      // Additionally, if omitPublicRecords is selected, we also omit public records (rowSecurity === 0).
      // If omitPrivateRecords is selected, we also omit private records (rowSecurity > 0).
      // But the requirement says: "due to the users security level".
      // This is exactly: rowSecurity > maxAllowedSecurity
      return rowSecurity > maxAllowedSecurity;
    }).length;
  }, [
    filterCivilization, 
    filterGalaxy, 
    filterRegion, 
    filterSystem, 
    filterType, 
    filterClass, 
    filterDiscoverer, 
    data, 
    savedSecurityLevel
  ]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndMatchedRecords.slice(start, start + itemsPerPage);
  }, [sortedAndMatchedRecords, currentPage, itemsPerPage]);

  const toggleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null); // Reset sort to default (none)
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };

  // Save sheet URL to localStorage
  useEffect(() => {
    if (sheetUrl) {
      localStorage.setItem('sheet_reporter_url', sheetUrl);
    }
  }, [sheetUrl]);

  const fetchData = async () => {
    if (!sheetUrl) {
      setError('Please provide a Google Sheet CSV URL in settings.');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setError(null);
    setMatchedRecords([]);

    try {
      // Handle the case where the user might paste a regular sheet URL instead of a pub link
      let fetchUrl = sheetUrl;
      if (sheetUrl.includes('docs.google.com/spreadsheets/') && !sheetUrl.includes('pub?')) {
        // Try to convert regular URL to CSV export if possible, 
        // though "Publish to Web" is the official way.
        if (sheetUrl.includes('/edit')) {
          fetchUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
        }
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Failed to fetch sheet data. Is it published to the web?');
      
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        delimiter: fetchUrl.includes('output=tsv') ? '\t' : undefined,
        complete: (results) => {
          const rawRows = results.data as string[][];
          if (rawRows.length < 2) {
            setError('The source sheet data is insufficient (need at least 2 rows).');
            setLoading(false);
            return;
          }

          setAllRawRows(rawRows);
          setLoading(false);
        },
        error: (err: any) => {
          setError(`Parsing error: ${err.message}`);
          setLoading(false);
        }
      });
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      setLoading(false);
    }
  };

  // Process rows whenever report type or raw rows or custom toggles change
  useEffect(() => {
    if (allRawRows.length >= 1) {
      const headerIndex = findHeaderRowIndex(allRawRows);
      const headerRow = allRawRows[headerIndex];
      
      let targetColumns: string[] = [];
      if (reportType === 'Simple') {
        targetColumns = ["Multi-tool Name", "Civilization", "Galaxy", "Region", "Star System", "Type", "Class", "Discoverer"];
      } else if (reportType === 'Detailed') {
        targetColumns = DETAILED_COL_INDICES.map(idx => getColLabel(idx, headerRow));
      } else if (reportType === 'Custom') {
        const customIndices = [0, ...DETAILED_COL_INDICES.slice(1).filter(idx => customToggles[idx] !== false)];
        targetColumns = customIndices.map(idx => getColLabel(idx, headerRow));
      }

      const filteredColumns = targetColumns.map(colName => ({
        name: colName,
        enabled: true
      }));

      setColumns(filteredColumns);

      const processedData = allRawRows.slice(headerIndex + 1)
        .filter(row => {
          const colA = String(row[0] || '').trim();
          return colA !== '' && !colA.toLowerCase().startsWith('name') && !colA.toLowerCase().startsWith('skiprow') && !colA.toUpperCase().includes('SKIPROW');
        })
        .map(row => {
          const obj: any = {
            "Multi-tool Name": String(row[0] || '').trim(),
            "Planet": String(row[1] || '').trim(),
            "Star System": String(row[2] || '').trim(),
            "Region": String(row[3] || '').trim(),
            "Galaxy": String(row[4] || '').trim(),
            "Type": String(row[10] || '').trim(),
            "Class": String(row[12] || '').trim(),
            "Civilization": String(row[18] || '').trim(),
            "Discoverer": String(row[19] || '').trim(),
            "Discovery Date": String(row[21] || '').trim()
          };

          // Map every column index to both its label and its column letter
          row.forEach((cell, cellIdx) => {
            const letter = getColumnLetter(cellIdx);
            const label = getColLabel(cellIdx, headerRow);
            const val = String(cell || '').trim();
            obj[label] = val;
            obj[letter] = val;
          });

          return obj;
        });

      setData(processedData);

      findRecord(
        processedData,
        filterCivilization,
        filterGalaxy,
        filterRegion,
        filterSystem,
        filterType,
        filterClass,
        filterDiscoverer
      );
    }
  }, [reportType, allRawRows, customToggles]);

  const handleSearch = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      if (!data.length) {
        fetchData();
      } else {
        findRecord(data);
      }
    }, 1500);
  };

  const findRecord = (
    sourceData = data,
    civ = filterCivilization,
    galaxy = filterGalaxy,
    region = filterRegion,
    system = filterSystem,
    type = filterType,
    cls = filterClass,
    discoverer = filterDiscoverer
  ) => {
    let termCiv = civ.trim().toLowerCase();
    let termGal = galaxy.trim().toLowerCase();
    let termReg = region.trim().toLowerCase();
    let termSys = system.trim().toLowerCase();
    let termType = type.trim().toLowerCase();
    let termClass = cls.trim().toLowerCase();
    let termDisc = discoverer.trim().toLowerCase();
    
    // Treat AGT as Alliance of Galactic Travellers
    if (termCiv === 'agt') {
      termCiv = 'alliance of galactic travellers';
    }

    const matches = sourceData.filter(row => {
      const rowCiv = String(row["Civilization"] || '').toLowerCase();
      const rowGal = String(row["Galaxy"] || '').toLowerCase();
      const rowReg = String(row["Region"] || '').toLowerCase();
      const rowSys = String(row["Star System"] || '').toLowerCase();
      const rowType = String(row["Type"] || '').toLowerCase();
      const rowClass = String(row["Class"] || '').toLowerCase();
      const rowDisc = String(row["Discoverer"] || '').toLowerCase();

      // If filter is "All", empty, or a match
      const civMatch = termCiv === 'all' || !termCiv || rowCiv.includes(termCiv);
      const galMatch = termGal === 'all' || !termGal || rowGal.includes(termGal);
      const regMatch = termReg === 'all' || !termReg || rowReg.includes(termReg);
      const sysMatch = termSys === 'all' || !termSys || rowSys.includes(termSys);
      const typeMatch = termType === 'all' || !termType || rowType.includes(termType);
      const classMatch = termClass === 'all' || !termClass || rowClass === termClass;
      const discMatch = termDisc === 'all' || !termDisc || rowDisc.includes(termDisc);

      const rowSecurity = getSecurityLevel(row["AK"]);
      const maxAllowedSecurity = savedSecurityLevel || 0;
      
      let securityMatch = rowSecurity <= maxAllowedSecurity;
      const hasCreds = !!(savedTravellerName && savedTravellerId);
      
      if (hasCreds && omitPublicRecords) {
        securityMatch = rowSecurity > 0 && rowSecurity <= maxAllowedSecurity;
      }
      if (hasCreds && omitPrivateRecords) {
        securityMatch = rowSecurity === 0;
      }

      return civMatch && galMatch && regMatch && sysMatch && typeMatch && classMatch && discMatch && securityMatch;
    });

    // Sort by Galaxy then by Multi-tool Name
    const sortedMatches = [...matches].sort((a, b) => {
      const galA = String(a["Galaxy"] || '').toLowerCase();
      const galB = String(b["Galaxy"] || '').toLowerCase();
      if (galA !== galB) return galA.localeCompare(galB);

      const nameA = String(a["Multi-tool Name"] || '').toLowerCase();
      const nameB = String(b["Multi-tool Name"] || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (sortedMatches.length > 0) {
      setMatchedRecords(sortedMatches);
      setError(null);
    } else {
      setMatchedRecords([]);
      setError("No records found for the selected criteria.");
    }
  };

  // Synchronise matches whenever filters are typed or changed live
  useEffect(() => {
    if (data.length > 0) {
      findRecord(
        data,
        filterCivilization,
        filterGalaxy,
        filterRegion,
        filterSystem,
        filterType,
        filterClass,
        filterDiscoverer
      );
    }
  }, [
    filterCivilization, 
    filterGalaxy, 
    filterRegion, 
    filterSystem, 
    filterType, 
    filterClass, 
    filterDiscoverer, 
    data, 
    savedSecurityLevel, 
    omitPublicRecords, 
    omitPrivateRecords, 
    savedTravellerName, 
    savedTravellerId
  ]);

  const triggerPdfDownloadProcessed = async () => {
    if (matchedRecords.length === 0) return;

    // Filter records with higher security level than matching user's security level (respecting omit public/private selections)
    const filteredRecords = matchedRecords.filter(record => {
      const rowSecurity = getSecurityLevel(record["AK"]);
      const maxAllowedSecurity = savedSecurityLevel || 0;
      
      let securityMatch = rowSecurity <= maxAllowedSecurity;
      const hasCreds = !!(savedTravellerName && savedTravellerId);
      if (hasCreds && omitPublicRecords) {
        securityMatch = rowSecurity > 0 && rowSecurity <= maxAllowedSecurity;
      }
      if (hasCreds && omitPrivateRecords) {
        securityMatch = rowSecurity === 0;
      }
      return securityMatch;
    });

    if (filteredRecords.length === 0) return;

    // Find the highest security level contained in the reported records
    let maxSecurityInReport = 0;
    let highestSecNameInReport = "";

    filteredRecords.forEach(record => {
      const rowSecurity = getSecurityLevel(record["AK"]);
      if (rowSecurity > maxSecurityInReport) {
        maxSecurityInReport = rowSecurity;
        highestSecNameInReport = String(record["AK"] || '').trim();
      }
    });

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape layout (297mm x 210mm)
    const galaxyFilterVal = filterGalaxy || 'All';
    let civFilterVal = filterCivilization || 'All';
    if (String(civFilterVal).trim().toUpperCase() === 'AGT') {
      civFilterVal = 'Alliance of Galactic Travellers';
    }
    
    const formatDateToDDMMMYYYY = (dateObj: Date): string => {
      const d = String(dateObj.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const m = months[dateObj.getMonth()];
      const y = dateObj.getFullYear();
      return `${d}-${m}-${y}`;
    };

    const formatMilitaryTime = (dateObj: Date): string => {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };

    const now = new Date();
    const formattedDate = formatDateToDDMMMYYYY(now);

    const getBase64Image = (url: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
              return;
            }
          } catch (e) {
            console.error("Canvas export failed for " + url, e);
          }
          resolve(null);
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    let logoBase64 = await getBase64Image("/AgtOfficialLogo.png");
    if (!logoBase64) {
      logoBase64 = await getBase64Image("/AGTIcon.png");
    }
    const iconBase64 = await getBase64Image("/AGTIcon.png");

    // COVER PAGE SETUP
    if (maxSecurityInReport > 0 && highestSecNameInReport) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 5, 0); // FF0500 Accent
      doc.text(`This report contains ${highestSecNameInReport} Intelligence`, 148.5, 28, { align: "center" });
    }

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 130.5, 36, 36, 36);
    } else {
      doc.setFillColor(255, 5, 0); // FF0500 Accent
      doc.rect(130.5, 36, 36, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text("AGT", 148.5, 56, { align: "center" });
    }

    // Title: "AGT Multi-tool Report"
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 5, 0); // FF0500 Accent
    doc.text("AGT Multi-tool Report", 148.5, 95, { align: "center" });

    // Details block below title with all 7 filter criteria and reduced font size & spacing
    const regFilterVal = filterRegion && filterRegion.trim() !== '' ? filterRegion : 'All';
    const sysFilterVal = filterSystem && filterSystem.trim() !== '' ? filterSystem : 'All';
    const typeFilterVal = filterType && filterType !== 'All' ? filterType : 'All';
    const classFilterVal = filterClass && filterClass !== 'All' ? filterClass : 'All';
    const discFilterVal = filterDiscoverer && filterDiscoverer.trim() !== '' ? filterDiscoverer : 'All';

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(60, 60, 60);

    let currentY = 112;
    const lineSpacing = 6.2;

    doc.text(`Civilization: ${civFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Galaxy: ${galaxyFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Region: ${regFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Star System: ${sysFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Type: ${typeFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Class: ${classFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Discoverer: ${discFilterVal}`, 148.5, currentY, { align: "center" });
    currentY += lineSpacing;
    doc.text(`Report Date: ${formattedDate}`, 148.5, currentY, { align: "center" });

    // Outer border frame for stylish presentation
    doc.setDrawColor(255, 5, 0); // FF0500 Accent
    doc.setLineWidth(1);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.3);
    doc.rect(12, 12, 273, 186);

    // Records page moves to the next page
    doc.addPage();

    const enabledCols = columns.filter(col => col.enabled);
    const tableHeaders = enabledCols.map(col => t(col.name));

    const tableData = filteredRecords.map(record => 
      enabledCols.map(col => record[col.name] || '-')
    );

    // PDF Table total row
    const totalRow = enabledCols.map(col => {
      if (col.name === enabledCols[0].name) return `${t("Number of Multi-tools")}: ${filteredRecords.length}`;
      return '';
    });
    tableData.push(totalRow);

    autoTable(doc, {
      startY: 28, // start table below repeating header boundary at Y=22
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [42, 42, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [30, 30, 30] },
      margin: { top: 30, left: 20, right: 20 },
      didDrawPage: (data) => {
        const logoX = 20;
        const logoY = 10;
        const logoSize = 10;
        
        if (iconBase64) {
          doc.addImage(iconBase64, 'PNG', logoX, logoY, logoSize, logoSize);
        } else {
          doc.setFillColor(255, 5, 0);
          doc.rect(logoX, logoY, logoSize, logoSize, "F");
        }
        
        doc.setFontSize(10);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`AGT Multi-tool Report - Galaxy: ${galaxyFilterVal} / Civ: ${civFilterVal}`, logoX + 13, logoY + 6);
        
        doc.setFontSize(8);
        doc.setFont("Helvetica", "normal");
        doc.text(`Page ${data.pageNumber}`, 277, logoY + 6, { align: "right" });

        doc.setDrawColor(255, 5, 0);
        doc.setLineWidth(0.5);
        doc.line(logoX, logoY + logoSize + 2, 277, logoY + logoSize + 2);
        
        if (data.pageNumber >= 1) {
          doc.setFontSize(8);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          const footerDateStr = formatDateToDDMMMYYYY(now);
          const militaryTimeStr = formatMilitaryTime(now);
          doc.text(`Report Created on: ${footerDateStr} ${militaryTimeStr}`, 20, 203, { align: "left" });
        }
      },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [245, 245, 245];
          data.cell.styles.textColor = [255, 5, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    doc.save(`AGT_Multitool_Report_${timestamp}.pdf`);
  };

  const triggerCsvDownloadProcessed = () => {
    if (matchedRecords.length === 0) return;

    const enabledCols = columns.filter(col => col.enabled);
    const displayHeaders = enabledCols.map(col => col.name);
    
    // Filter records with higher security level than matching user's security level (respecting omit public/private selections)
    const filteredRecords = matchedRecords.filter(record => {
      const rowSecurity = getSecurityLevel(record["AK"]);
      const maxAllowedSecurity = savedSecurityLevel || 0;
      
      let securityMatch = rowSecurity <= maxAllowedSecurity;
      const hasCreds = !!(savedTravellerName && savedTravellerId);
      if (hasCreds && omitPublicRecords) {
        securityMatch = rowSecurity > 0 && rowSecurity <= maxAllowedSecurity;
      }
      if (hasCreds && omitPrivateRecords) {
        securityMatch = rowSecurity === 0;
      }
      return securityMatch;
    });

    const rows = filteredRecords.map(record =>
      enabledCols.map(col => record[col.name] || '')
    );

    const totalRow = enabledCols.map(col => {
      if (col.name === enabledCols[0].name) return `${t("Number of Multi-tools")}: ${filteredRecords.length}`;
      return '';
    });
    rows.push(totalRow);

    const csvContent = Papa.unparse({
      fields: displayHeaders,
      data: rows
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nowCsv = new Date();
    const yr = nowCsv.getFullYear();
    const mo = String(nowCsv.getMonth() + 1).padStart(2, '0');
    const dy = String(nowCsv.getDate()).padStart(2, '0');
    const hr = String(nowCsv.getHours()).padStart(2, '0');
    const mn = String(nowCsv.getMinutes()).padStart(2, '0');
    const sc = String(nowCsv.getSeconds()).padStart(2, '0');
    const csvTimestamp = `${yr}${mo}${dy}_${hr}${mn}${sc}`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `AGT_Multitool_Report_CSV_${csvTimestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const decodeXOR = (encodedText: string): string => {
    const key = 969; 
    let decoded = ""; 
    for (let i = 0; i < encodedText.length; i++) { 
      let charCode = encodedText.charCodeAt(i); 
      let originalCharCode = charCode ^ key; 
      decoded += String.fromCharCode(originalCharCode); 
    } 
    return decoded; 
  };

  const verifyAndDownloadCsv = async () => {
    setIsVerifying(true);
    setVerificationError(null);

    const nameTrimmed = travellerName.trim();
    const idTrimmed = travellerId.trim();

    if (!nameTrimmed) {
      setVerificationError(t("Please enter your Traveller Name."));
      setIsVerifying(false);
      return;
    }

    if (!/^[a-zA-Z0-9\s-_]{1,42}$/.test(nameTrimmed)) {
      setVerificationError("Traveller Name must be alphanumeric and up to 42 characters.");
      setIsVerifying(false);
      return;
    }

    const idRegex = /^\d{8}-[0-9A-Z]{4}-\d{4}$/;
    if (!idRegex.test(idTrimmed)) {
      setVerificationError("Traveller ID format must be ########-????-#### (e.g. 37411005-HN4T-7407).");
      setIsVerifying(false);
      return;
    }

    try {
      const response = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSOZq3Cl2e0aNqzXdLRe63HuM7PlqGH3HnS_-0x6P_CYnGDJlK5QvI-YjU0lNaOgLyp3uoktS4WIXyK/pub?gid=505079663&single=true&output=tsv");
      if (!response.ok) {
        throw new Error("Failed to fetch database");
      }
      const tsvText = await response.text();
      const rows = tsvText.split(/\r?\n/).map(row => row.split("\t"));

      let foundMatchingRow: string[] | null = null;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length >= 2) {
          const colAVal = row[0] || '';
          if (colAVal.trim().toLowerCase() === nameTrimmed.toLowerCase()) {
            foundMatchingRow = row;
            break;
          }
        }
      }

      if (!foundMatchingRow) {
        setVerificationError(
          <span>
            {t("Traveller Name and ID and does not match, Please consult ")}
            <a 
              href="https://www.nms-agt.com/support/traveller-id" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#FF0500] hover:underline hover:text-[#FFB451] font-bold"
            >
              AGT Support
            </a>
          </span>
        );
        setIsVerifying(false);
        return;
      }

      const colBVal = foundMatchingRow[1] || '';
      const decodedB = decodeXOR(colBVal);

      const matchedA = (foundMatchingRow[0]?.trim().toLowerCase() === nameTrimmed.toLowerCase());
      const matchedB = (decodedB.trim().toLowerCase() === idTrimmed.toLowerCase());

      if (!matchedA || !matchedB) {
        setVerificationError(
          <span>
            {t("Traveller Name and ID and does not match, Please consult ")}
            <a 
              href="https://www.nms-agt.com/support/traveller-id" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#FF0500] hover:underline hover:text-[#FFB451] font-bold"
            >
              AGT Support
            </a>
          </span>
        );
        setIsVerifying(false);
        return;
      }

      const colCVal = foundMatchingRow[2] || '';
      const levelNum = parseFloat(colCVal);

      if (isNaN(levelNum) || levelNum <= 0) {
        setVerificationError(
          <span>
            {t(" Your Authorization level does not provide access. If you have questions contact ")}
            <a 
              href="https://www.nms-agt.com/support/traveller-id" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#FF0500] hover:underline hover:text-[#FFB451] font-bold"
            >
              AGT Support
            </a>
          </span>
        );
        setIsVerifying(false);
        return;
      }

      // Save to cookie and verify
      setCookie('agt_traveller_name', nameTrimmed, 365);
      setCookie('agt_traveller_id', idTrimmed, 365);
      setCookie('agt_security_level', String(levelNum), 365);

      const checkName = getCookie('agt_traveller_name');
      const checkId = getCookie('agt_traveller_id');
      const checkLevel = getCookie('agt_security_level');

      if (checkName === nameTrimmed && checkId === idTrimmed && checkLevel === String(levelNum)) {
        setPopupMessage("Verification successful, setting saved");
        setSavedTravellerName(nameTrimmed);
        setSavedTravellerId(idTrimmed);
        setSavedSecurityLevel(levelNum);
      } else {
        setPopupMessage("Verification successful, setting save error");
      }

      setShowVerificationModal(false);
      if (exportType === 'pdf') {
        triggerPdfDownloadProcessed();
      } else {
        triggerCsvDownloadProcessed();
      }
    } catch (err) {
      console.error(err);
      setVerificationError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const downloadFullReportCsv = () => {
    if (matchedRecords.length === 0) return;

    const cookieName = getCookie('agt_traveller_name');
    const cookieId = getCookie('agt_traveller_id');
    const cookieLevelStr = getCookie('agt_security_level');

    if (cookieName && cookieId && cookieLevelStr) {
      // Skip the prompt modal entirely!
      triggerCsvDownloadProcessed();
    } else {
      setExportType('csv');
      setTravellerName('');
      setTravellerId('');
      setVerificationError(null);
      setIsVerifying(false);
      setShowVerificationModal(true);
    }
  };

  const downloadFullReportPdf = () => {
    if (matchedRecords.length === 0) return;

    const cookieName = getCookie('agt_traveller_name');
    const cookieId = getCookie('agt_traveller_id');
    const cookieLevelStr = getCookie('agt_security_level');

    if (cookieName && cookieId && cookieLevelStr) {
      // Skip the prompt modal entirely!
      triggerPdfDownloadProcessed();
    } else {
      setExportType('pdf');
      setTravellerName('');
      setTravellerId('');
      setVerificationError(null);
      setIsVerifying(false);
      setShowVerificationModal(true);
    }
  };

  const handleSaveSettingsCredentials = async () => {
    setIsSettingsVerifying(true);

    const nameTrimmed = settingsTravellerName.trim();
    const idTrimmed = settingsTravellerId.trim();

    if (!nameTrimmed || !idTrimmed) {
      setPopupMessage("Verification unsuccessful");
      setIsSettingsVerifying(false);
      return;
    }

    if (!/^[a-zA-Z0-9\s-_]{1,42}$/.test(nameTrimmed)) {
      setPopupMessage("Verification unsuccessful");
      setIsSettingsVerifying(false);
      return;
    }

    const idRegex = /^\d{8}-[0-9A-Z]{4}-\d{4}$/;
    if (!idRegex.test(idTrimmed)) {
      setPopupMessage("Verification unsuccessful");
      setIsSettingsVerifying(false);
      return;
    }

    try {
      const response = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSOZq3Cl2e0aNqzXdLRe63HuM7PlqGH3HnS_-0x6P_CYnGDJlK5QvI-YjU0lNaOgLyp3uoktS4WIXyK/pub?gid=505079663&single=true&output=tsv");
      if (!response.ok) {
        throw new Error("Failed to fetch database");
      }
      const tsvText = await response.text();
      const rows = tsvText.split(/\r?\n/).map(row => row.split("\t"));

      let foundMatchingRow: string[] | null = null;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length >= 2) {
          const colAVal = row[0] || '';
          if (colAVal.trim().toLowerCase() === nameTrimmed.toLowerCase()) {
            foundMatchingRow = row;
            break;
          }
        }
      }

      if (!foundMatchingRow) {
        setPopupMessage("Verification unsuccessful");
        setIsSettingsVerifying(false);
        return;
      }

      const colBVal = foundMatchingRow[1] || '';
      const decodedB = decodeXOR(colBVal);

      const matchedA = (foundMatchingRow[0]?.trim().toLowerCase() === nameTrimmed.toLowerCase());
      const matchedB = (decodedB.trim().toLowerCase() === idTrimmed.toLowerCase());

      if (!matchedA || !matchedB) {
        setPopupMessage("Verification unsuccessful");
        setIsSettingsVerifying(false);
        return;
      }

      const colCVal = foundMatchingRow[2] || '';
      const levelNum = parseFloat(colCVal);

      if (isNaN(levelNum) || levelNum <= 0) {
        setPopupMessage(" Your Authorization level does not provide access. If you have questions contact AGT Support (https://www.nms-agt.com/support/traveller-id)");
        setIsSettingsVerifying(false);
        return;
      }

      // Save to cookie and verify
      setCookie('agt_traveller_name', nameTrimmed, 365);
      setCookie('agt_traveller_id', idTrimmed, 365);
      setCookie('agt_security_level', String(levelNum), 365);

      const checkName = getCookie('agt_traveller_name');
      const checkId = getCookie('agt_traveller_id');
      const checkLevel = getCookie('agt_security_level');

      if (checkName === nameTrimmed && checkId === idTrimmed && checkLevel === String(levelNum)) {
        setPopupMessage("Verification successful, setting saved");
        setSavedTravellerName(nameTrimmed);
        setSavedTravellerId(idTrimmed);
        setSavedSecurityLevel(levelNum);
      } else {
        setPopupMessage("Verification successful, setting save error");
      }
    } catch (err) {
      console.error(err);
      setPopupMessage("Verification unsuccessful");
    } finally {
      setIsSettingsVerifying(false);
    }
  };

  const handleClearSettingsCredentials = () => {
    eraseCookie('agt_traveller_name');
    eraseCookie('agt_traveller_id');
    eraseCookie('agt_security_level');

    const checkName = getCookie('agt_traveller_name');
    const checkId = getCookie('agt_traveller_id');
    const checkLevel = getCookie('agt_security_level');

    if (!checkName && !checkId && !checkLevel) {
      setPopupMessage("Clearing successful");
      setSavedTravellerName('');
      setSavedTravellerId('');
      setSavedSecurityLevel(0);
      setSettingsTravellerName('');
      setSettingsTravellerId('');
      setOmitPublicRecords(false);
      setOmitPrivateRecords(false);
    } else {
      setPopupMessage("Clearing failed");
    }
  };

  const toggleColumn = (name: string) => {
    setColumns(prev => prev.map(c => c.name === name ? { ...c, enabled: !c.enabled } : c));
  };

  const activeColumnsCount = useMemo(() => columns.filter(c => c.enabled).length, [columns]);

  const totalPoints = useMemo(() => {
    return matchedRecords.length;
  }, [matchedRecords]);

  return (
    <div 
      onMouseDown={handleManualPlay}
      onTouchStart={handleManualPlay}
      className="min-h-screen bg-[#0a0a0a] text-agt-orange font-sans selection:bg-agt-orange selection:text-black"
    >
      <style>{`
        @media (min-width: 768px) {
          html {
            font-size: ${16 * parseFloat(textScale)}px !important;
          }
        }
      `}</style>
      {/* Header */}
      <header className="border-b border-agt-orange/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/AGTIcon.png" 
              alt="AGT Logo" 
              className="w-10 h-10 object-contain opacity-90"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                if (!img.parentElement?.querySelector('.agt-fallback')) {
                  img.parentElement?.insertAdjacentHTML('afterbegin', '<div class="agt-fallback w-10 h-10 bg-[#FFB451] rounded-sm flex items-center justify-center shrink-0"><span class="text-black font-bold text-[10px] tracking-tighter">AGT</span></div>');
                }
              }}
            />
            <div className="flex flex-col">
              <h1 className="font-bold text-[#FFB451] text-xs tracking-[0.2em] uppercase">{t("Alliance of Galactic Travellers")}</h1>
              <span className="text-[9px] text-[#FFB451] uppercase tracking-[0.3em] font-bold">{t("AGT Multi-tool Report Tool")}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-[9px] text-[#FFB451] tracking-widest font-mono">
              {t("STATUS:")} <span className={
                loading ? 'text-yellow-500' :
                sheetUrl ? 'text-emerald-500' : 
                'text-red-500'
              }>
                {loading ? t('SYNCING') : sheetUrl ? t('CONNECTED') : t('DISCONNECTED')}
              </span>
            </div>
            {savedTravellerName && savedTravellerId ? (
              <div 
                id="header-traveller-badge"
                className="border border-green-500 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold text-green-500 whitespace-nowrap"
              >
                {savedTravellerName.slice(0, 20)}
              </div>
            ) : (
              <div 
                id="header-traveller-badge"
                className="border border-[#FF0500] rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold text-[#FF0500] whitespace-nowrap"
              >
                Public User
              </div>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-[#FF0500]/10 rounded-lg transition-colors relative group cursor-pointer"
              title="Settings"
              id="settings-btn"
            >
              <Settings 
                className="w-5 h-5 transition-transform duration-700 hover:rotate-360" 
                style={{ color: '#FF0550' }} 
              />
              {!sheetUrl && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#FF0500] rounded-full shadow-[0_0_5px_rgba(255,5,0,0.5)]"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-16">
          
          {/* Main Search Logic Container - centered aesthetic */}
          <div className="flex flex-col items-center space-y-12">
            <div className="w-full max-w-xl text-center space-y-6">
              
              {/* Center aligned multi-tools-icon.png before the title */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <img 
                  src={regionsIcon} 
                  alt="Multi-tool Icon" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h2 className="text-4xl font-light tracking-tight text-[#FFB451]">{t("AGT Multi-tool Report Tool")}</h2>
              </div>
              
              {/* Report Format Toggle Switch */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-[#161616] border-2 border-[#FF0500] rounded-full">
                  <button
                    onClick={() => setReportType('Simple')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Simple'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    {t("Simple Report")}
                  </button>
                  <button
                    onClick={() => setReportType('Detailed')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Detailed'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    {t("Detailed Report")}
                  </button>
                  <button
                    onClick={() => setReportType('Custom')}
                    className={`px-5 py-2 text-[10px] uppercase font-black tracking-widest rounded-full transition-all cursor-pointer ${
                      reportType === 'Custom'
                        ? 'bg-[#FF0500] text-white shadow-lg shadow-[#FF0500]/25'
                        : 'text-[#FFB451]/55 hover:text-[#FFB451]'
                    }`}
                  >
                    {t("Custom Report")}
                  </button>
                </div>
              </div>
            </div>

            {/* Grid for all 7 Criteria Filters */}
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-black/30 border border-[#FF0500]/15 p-8 rounded-3xl backdrop-blur-sm shadow-[0_15px_35px_rgba(0,0,0,0.3)]">
              
              {/* Input 1: Civilization */}
              <div className="flex flex-col space-y-2 col-span-1 sm:col-span-2">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Civilization")} ({t("optional")})
                </label>
                <div ref={civAutocompleteRef} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451]/85 transition-colors z-10">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={filterCivilization}
                    placeholder={t("Type or select civilization...")}
                    onFocus={() => {
                      setIsCivDropdownOpen(true);
                      setActiveCivIndex(0);
                    }}
                    onChange={(e) => {
                      setFilterCivilization(e.target.value);
                      setIsCivDropdownOpen(true);
                      setActiveCivIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!isCivDropdownOpen) {
                          setIsCivDropdownOpen(true);
                          setActiveCivIndex(0);
                        } else {
                          setActiveCivIndex((prev) => (prev + 1) % Math.max(1, filteredCivilizations.length));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (isCivDropdownOpen) {
                          setActiveCivIndex((prev) => (prev - 1 + filteredCivilizations.length) % Math.max(1, filteredCivilizations.length));
                        }
                      } else if (e.key === 'Enter') {
                        if (isCivDropdownOpen && filteredCivilizations.length > 0) {
                          e.preventDefault();
                          const selected = filteredCivilizations[activeCivIndex];
                          if (selected) {
                            setFilterCivilization(selected);
                            setIsCivDropdownOpen(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsCivDropdownOpen(false);
                      }
                    }}
                    className="block w-full pl-12 pr-10 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_15px_rgba(255,5,0,0.1)] focus:shadow-[0_0_25px_rgba(255,5,0,0.35)]"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCivDropdownOpen((prev) => !prev);
                    }}
                    className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isCivDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                  </button>

                  <AnimatePresence>
                    {isCivDropdownOpen && filteredCivilizations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                      >
                        {filteredCivilizations.map((civ, idx) => {
                          const isActive = idx === activeCivIndex;
                          return (
                            <div
                              key={civ}
                              onClick={() => {
                                setFilterCivilization(civ);
                                setIsCivDropdownOpen(false);
                              }}
                              onMouseEnter={() => {
                                setActiveCivIndex(idx);
                              }}
                              className={`px-5 py-2.5 cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                                isActive 
                                  ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                  : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                              }`}
                            >
                              <span>{civ}</span>
                              {civ === 'All' && (
                                <span className="text-[9px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-1.5 py-0.5 rounded">
                                  {t("Show All")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Input 2: Galaxy */}
              <div className="flex flex-col space-y-2 col-span-1 sm:col-span-2">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Galaxy")} ({t("optional")})
                </label>
                <div ref={autocompleteRef} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451]/85 transition-colors z-10">
                    <Globe className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={filterGalaxy}
                    placeholder={t("Type or select galaxy...")}
                    onFocus={() => {
                      setIsGalaxyDropdownOpen(true);
                      setActiveGalaxyIndex(0);
                    }}
                    onChange={(e) => {
                      setFilterGalaxy(e.target.value);
                      setIsGalaxyDropdownOpen(true);
                      setActiveGalaxyIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!isGalaxyDropdownOpen) {
                          setIsGalaxyDropdownOpen(true);
                          setActiveGalaxyIndex(0);
                        } else {
                          setActiveGalaxyIndex((prev) => (prev + 1) % Math.max(1, filteredGalaxies.length));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (isGalaxyDropdownOpen) {
                          setActiveGalaxyIndex((prev) => (prev - 1 + filteredGalaxies.length) % Math.max(1, filteredGalaxies.length));
                        }
                      } else if (e.key === 'Enter') {
                        if (isGalaxyDropdownOpen && filteredGalaxies.length > 0) {
                          e.preventDefault();
                          const selected = filteredGalaxies[activeGalaxyIndex];
                          if (selected) {
                            setFilterGalaxy(selected);
                            setIsGalaxyDropdownOpen(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsGalaxyDropdownOpen(false);
                      }
                    }}
                    className="block w-full pl-12 pr-10 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_15px_rgba(255,5,0,0.1)] focus:shadow-[0_0_25px_rgba(255,5,0,0.35)]"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsGalaxyDropdownOpen((prev) => !prev);
                    }}
                    className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isGalaxyDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                  </button>

                  <AnimatePresence>
                    {isGalaxyDropdownOpen && filteredGalaxies.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                      >
                        {filteredGalaxies.map((gal, idx) => {
                          const isActive = idx === activeGalaxyIndex;
                          return (
                            <div
                              key={gal}
                              onClick={() => {
                                setFilterGalaxy(gal);
                                setIsGalaxyDropdownOpen(false);
                              }}
                              onMouseEnter={() => {
                                setActiveGalaxyIndex(idx);
                              }}
                              className={`px-5 py-2.5 cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                                isActive 
                                  ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                  : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                              }`}
                            >
                              <span>{gal}</span>
                              {gal === 'All' && (
                                <span className="text-[9px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-1.5 py-0.5 rounded">
                                  {t("Show All")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Omit checkboxes */}
                {savedTravellerName && savedTravellerId && (
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono text-[#FFB451] text-left">
                    <label className="inline-flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={omitPublicRecords}
                        onChange={(e) => {
                          setOmitPublicRecords(e.target.checked);
                          if (e.target.checked) {
                            setOmitPrivateRecords(false);
                          }
                        }}
                        className="accent-[#FF0500] w-3.5 h-3.5 bg-[#2a2a2a] border border-[#FF0500]/45 rounded cursor-pointer transition-all focus:ring-1 focus:ring-[#FF0500]"
                      />
                      <span className="select-none group-hover:text-white transition-colors">Omit Public Records</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={omitPrivateRecords}
                        onChange={(e) => {
                          setOmitPrivateRecords(e.target.checked);
                          if (e.target.checked) {
                            setOmitPublicRecords(false);
                          }
                        }}
                        className="accent-[#FF0500] w-3.5 h-3.5 bg-[#2a2a2a] border border-[#FF0500]/45 rounded cursor-pointer transition-all focus:ring-1 focus:ring-[#FF0500]"
                      />
                      <span className="select-none group-hover:text-white transition-colors">Omit Private Records</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Input 3: Region */}
              <div ref={regionAutocompleteRef} className="flex flex-col space-y-2 col-span-1 relative">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Region")} ({t("optional")})
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451]/85 transition-colors z-10">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={filterRegion}
                    placeholder={t("All Regions...")}
                    onFocus={() => {
                      setIsRegionDropdownOpen(true);
                      setActiveRegionIndex(0);
                    }}
                    onChange={(e) => {
                      setFilterRegion(e.target.value);
                      setIsRegionDropdownOpen(true);
                      setActiveRegionIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!isRegionDropdownOpen) {
                          setIsRegionDropdownOpen(true);
                          setActiveRegionIndex(0);
                        } else {
                          setActiveRegionIndex((prev) => (prev + 1) % Math.max(1, filteredRegions.length));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (isRegionDropdownOpen) {
                          setActiveRegionIndex((prev) => (prev - 1 + filteredRegions.length) % Math.max(1, filteredRegions.length));
                        }
                      } else if (e.key === 'Enter') {
                        if (isRegionDropdownOpen && filteredRegions.length > 0) {
                          e.preventDefault();
                          const selected = filteredRegions[activeRegionIndex];
                          if (selected) {
                            setFilterRegion(selected === 'All' ? 'All' : selected);
                            setIsRegionDropdownOpen(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsRegionDropdownOpen(false);
                      }
                    }}
                    className="block w-full pl-12 pr-10 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_15px_rgba(255,5,0,0.1)] focus:shadow-[0_0_25px_rgba(255,5,0,0.35)]"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRegionDropdownOpen((prev) => !prev);
                    }}
                    className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isRegionDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                  </button>

                  <AnimatePresence>
                    {isRegionDropdownOpen && filteredRegions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                      >
                        {filteredRegions.map((reg, idx) => {
                          const isActive = idx === activeRegionIndex;
                          return (
                            <div
                              key={reg}
                              onClick={() => {
                                setFilterRegion(reg);
                                setIsRegionDropdownOpen(false);
                              }}
                              onMouseEnter={() => {
                                setActiveRegionIndex(idx);
                              }}
                              className={`px-5 py-2.5 cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                                isActive 
                                  ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                  : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                              }`}
                            >
                              <span>{reg}</span>
                              {reg === 'All' && (
                                <span className="text-[9px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-1.5 py-0.5 rounded">
                                  {t("Show All")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Input 4: Star System */}
              <div ref={systemAutocompleteRef} className="flex flex-col space-y-2 col-span-1 relative">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                   {t("Star System")} ({t("optional")})
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451]/85 transition-colors z-10">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={filterSystem}
                    placeholder={t("All Systems...")}
                    onFocus={() => {
                      setIsSystemDropdownOpen(true);
                      setActiveSystemIndex(0);
                    }}
                    onChange={(e) => {
                      setFilterSystem(e.target.value);
                      setIsSystemDropdownOpen(true);
                      setActiveSystemIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!isSystemDropdownOpen) {
                          setIsSystemDropdownOpen(true);
                          setActiveSystemIndex(0);
                        } else {
                          setActiveSystemIndex((prev) => (prev + 1) % Math.max(1, filteredSystems.length));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (isSystemDropdownOpen) {
                          setActiveSystemIndex((prev) => (prev - 1 + filteredSystems.length) % Math.max(1, filteredSystems.length));
                        }
                      } else if (e.key === 'Enter') {
                        if (isSystemDropdownOpen && filteredSystems.length > 0) {
                          e.preventDefault();
                          const selected = filteredSystems[activeSystemIndex];
                          if (selected) {
                            setFilterSystem(selected === 'All' ? 'All' : selected);
                            setIsSystemDropdownOpen(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsSystemDropdownOpen(false);
                      }
                    }}
                    className="block w-full pl-12 pr-10 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_15px_rgba(255,5,0,0.1)] focus:shadow-[0_0_25px_rgba(255,5,0,0.35)]"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSystemDropdownOpen((prev) => !prev);
                    }}
                    className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSystemDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                  </button>

                  <AnimatePresence>
                    {isSystemDropdownOpen && filteredSystems.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                      >
                        {filteredSystems.map((sys, idx) => {
                          const isActive = idx === activeSystemIndex;
                          return (
                            <div
                              key={sys}
                              onClick={() => {
                                setFilterSystem(sys);
                                setIsSystemDropdownOpen(false);
                              }}
                              onMouseEnter={() => {
                                setActiveSystemIndex(idx);
                              }}
                              className={`px-5 py-2.5 cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                                isActive 
                                  ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                  : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                              }`}
                            >
                              <span>{sys}</span>
                              {sys === 'All' && (
                                <span className="text-[9px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-1.5 py-0.5 rounded">
                                  {t("Show All")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Input 5: Type */}
              <div className="flex flex-col space-y-2 col-span-1">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Type")} ({t("optional")})
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="block w-full px-5 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] cursor-pointer"
                >
                  {typeOptions.map(opt => (
                    <option key={opt} value={opt} className="bg-[#1a1a1a] text-[#FFB451]">
                      {opt === 'All' ? t('Show All') : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input 6: Class */}
              <div className="flex flex-col space-y-2 col-span-1">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Class")} ({t("optional")})
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="block w-full px-5 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] cursor-pointer"
                >
                  {classOptions.map(opt => (
                    <option key={opt} value={opt} className="bg-[#1a1a1a] text-[#FFB451]">
                      {opt === 'All' ? t('Show All') : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input 7: Discoverer */}
              <div ref={discovererAutocompleteRef} className="flex flex-col space-y-2 col-span-1 sm:col-span-2 relative">
                <label className="text-[#FFB451] text-[10px] font-mono font-bold tracking-widest uppercase block text-left">
                  {t("Discoverer")} ({t("optional")})
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#FFB451] group-focus-within:text-[#FFB451]/85 transition-colors z-10">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={filterDiscoverer}
                    placeholder={t("All Discoverers...")}
                    onFocus={() => {
                      setIsDiscovererDropdownOpen(true);
                      setActiveDiscovererIndex(0);
                    }}
                    onChange={(e) => {
                      setFilterDiscoverer(e.target.value);
                      setIsDiscovererDropdownOpen(true);
                      setActiveDiscovererIndex(0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (!isDiscovererDropdownOpen) {
                          setIsDiscovererDropdownOpen(true);
                          setActiveDiscovererIndex(0);
                        } else {
                          setActiveDiscovererIndex((prev) => (prev + 1) % Math.max(1, filteredDiscoverers.length));
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (isDiscovererDropdownOpen) {
                          setActiveDiscovererIndex((prev) => (prev - 1 + filteredDiscoverers.length) % Math.max(1, filteredDiscoverers.length));
                        }
                      } else if (e.key === 'Enter') {
                        if (isDiscovererDropdownOpen && filteredDiscoverers.length > 0) {
                          e.preventDefault();
                          const selected = filteredDiscoverers[activeDiscovererIndex];
                          if (selected) {
                            setFilterDiscoverer(selected === 'All' ? 'All' : selected);
                            setIsDiscovererDropdownOpen(false);
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsDiscovererDropdownOpen(false);
                      }
                    }}
                    className="block w-full pl-12 pr-10 py-3.5 bg-[#2a2a2a] border-2 border-[#FF0500] rounded-full text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FF0500] focus:border-[#FF0500] transition-all text-[#FFB451] placeholder:text-[#FFB451]/50 shadow-[0_0_15px_rgba(255,5,0,0.1)] focus:shadow-[0_0_25px_rgba(255,5,0,0.35)]"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDiscovererDropdownOpen((prev) => !prev);
                    }}
                    className="absolute right-4 inset-y-0 flex items-center text-[#FFB451] hover:text-[#FFB451]/80 focus:outline-none z-10"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isDiscovererDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                  </button>

                  <AnimatePresence>
                    {isDiscovererDropdownOpen && filteredDiscoverers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1a1a1a] border-2 border-[#FF0500] rounded-2xl shadow-[0_10px_35px_rgba(255,5,0,0.45)] z-50 overflow-hidden divide-y divide-[#FF0500]/10 slim-scroll"
                      >
                        {filteredDiscoverers.map((disc, idx) => {
                          const isActive = idx === activeDiscovererIndex;
                          return (
                            <div
                              key={disc}
                              onClick={() => {
                                setFilterDiscoverer(disc);
                                setIsDiscovererDropdownOpen(false);
                              }}
                              onMouseEnter={() => {
                                setActiveDiscovererIndex(idx);
                              }}
                              className={`px-5 py-2.5 cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                                isActive 
                                  ? 'bg-[#FF0500]/20 text-white font-bold border-l-4 border-l-[#FF0500]' 
                                  : 'text-[#FFB451] hover:text-[#FFB451]/80 hover:bg-[#FF0500]/5'
                              }`}
                            >
                              <span>{disc}</span>
                              {disc === 'All' && (
                                <span className="text-[9px] uppercase bg-[#FF0500]/20 text-white tracking-widest font-bold px-1.5 py-0.5 rounded">
                                  {t("Show All")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-20 py-5 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-full font-black text-sm uppercase tracking-[0.2em] hover:bg-[#FF0500]/85 active:scale-[0.96] disabled:opacity-25 disabled:pointer-events-none shadow-[0_4px_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.5)] transition-all flex items-center gap-2 cursor-pointer"
              id="fetch-btn"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 text-white" />
                  <span className="text-white">{t("Extract Reports")}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setFilterCivilization('All');
                setFilterGalaxy('All');
                setFilterRegion('');
                setFilterSystem('');
                setFilterType('All');
                setFilterClass('All');
                setFilterDiscoverer('');
              }}
              className="px-8 py-5 bg-[#161616] border-2 border-[#FF0500]/40 text-[#FFB451] hover:text-white hover:border-[#FF0500] rounded-full font-black text-xs uppercase tracking-[0.15em] hover:bg-[#FF0500]/15 active:scale-[0.96] transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
              id="reset-btn"
              title={t("Reset Fields")}
            >
              <RotateCcw className="w-4.5 h-4.5 text-[#FF0500]" />
              <span>{t("Reset Fields")}</span>
            </button>
          </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 px-6 py-3 bg-[#FFB451]/5 border border-[#FFB451]/20 text-[#FFB451] rounded-full text-xs font-medium tracking-wide mx-auto"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
            
          <div className="space-y-12">
            
          {/* Settings Overlay - Pop Up Box on top of the main display */}
          <AnimatePresence>
            {showSettings && (
              <div 
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4 pointer-events-auto"
                onClick={() => setShowSettings(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="relative bg-[#0d0d0d] border-2 border-[#FF0500] rounded-2xl max-w-2xl w-full p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button inside modal header */}
                  <div className="flex justify-between items-center pb-4 border-b border-[#FF0500]/20 mb-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#FFB451] flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#FF0550] animate-spin" style={{ color: '#FF0550' }} />
                      Control Settings
                    </h3>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="px-5 py-2.5 bg-[#FF0500] border-2 border-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.3)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Display Settings Section */}
                    <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                        <Sliders className="w-3 h-3 text-[#FFB451]" />
                        {t("Display Settings")}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">{t("Max Records on screen")}</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value={15} className="bg-[#161616] text-[#FFB451]">{t("15 Records")}</option>
                            <option value={30} className="bg-[#161616] text-[#FFB451]">{t("30 Records")}</option>
                            <option value={50} className="bg-[#161616] text-[#FFB451]">{t("50 Records")}</option>
                            <option value={100} className="bg-[#161616] text-[#FFB451]">{t("100 Records")}</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">{t("Text Scaling (Desktop Mode)")}</span>
                          <select
                            value={textScale}
                            onChange={(e) => {
                              setTextScale(e.target.value);
                              localStorage.setItem('agt_text_scale', e.target.value);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value="1" className="bg-[#161616] text-[#FFB451]">{t("1x (Default)")}</option>
                            <option value="1.5" className="bg-[#161616] text-[#FFB451]">{t("1.5x")}</option>
                            <option value="2" className="bg-[#161616] text-[#FFB451]">{t("2x")}</option>
                            <option value="2.5" className="bg-[#161616] text-[#FFB451]">{t("2.5x")}</option>
                            <option value="3" className="bg-[#161616] text-[#FFB451]">{t("3x")}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Language Settings Section */}
                    <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                      <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                        <Globe className="w-3 h-3 text-[#FFB451]" />
                        {t("Select Language")}
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] text-[#FFB451]/60 uppercase tracking-widest font-bold font-mono block mb-1">{t("Select Language")}</span>
                          <select
                            value={language}
                            onChange={(e) => {
                              const newLang = e.target.value as any;
                              setLanguage(newLang);
                              localStorage.setItem('agt_language', newLang);
                            }}
                            className="w-full bg-[#161616] border-2 border-[#FF0500] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] cursor-pointer transition-colors"
                          >
                            <option value="en" className="bg-[#161616] text-[#FFB451]">English (EN)</option>
                            <option value="fr" className="bg-[#161616] text-[#FFB451]">Français (FR)</option>
                            <option value="es" className="bg-[#161616] text-[#FFB451]">Español (ES)</option>
                            <option value="de" className="bg-[#161616] text-[#FFB451]">Deutsch (DE)</option>
                            <option value="pt" className="bg-[#161616] text-[#FFB451]">Português (PT)</option>
                            <option value="th" className="bg-[#161616] text-[#FFB451]">ไทย (TH)</option>
                            <option value="hi" className="bg-[#161616] text-[#FFB451]">हिन्दी (HI)</option>
                            <option value="ja" className="bg-[#161616] text-[#FFB451]">日本語 (JA)</option>
                            <option value="zh" className="bg-[#161616] text-[#FFB451]">中文 (ZH)</option>
                            <option value="it" className="bg-[#161616] text-[#FFB451]">Italiano (IT)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Custom Report Column Toggle Subsection */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                        <h3 className="text-[12px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-[#FFB451]" />
                          {t("Custom Report Column Toggle")}
                        </h3>
                        <p className="text-[12.5px] text-[#FFB451]/60 font-mono text-left">
                          Choose which columns are present in the "Custom" report. {t("The name is always included.")}
                        </p>
                        
                        {/* Grid of toggle buttons for B to AJ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {DETAILED_COL_INDICES.slice(1).map(idx => {
                            const letter = getColumnLetter(idx);
                            const headerIndex = findHeaderRowIndex(allRawRows);
                            const headerName = allRawRows[headerIndex]?.[idx] || '';
                            const buttonText = headerName ? t(headerName) : `Column ${letter}`;
                            const isEnabled = customToggles[idx] !== false;
                            const tooltipText = buttonText.replace(/^\[[A-Za-z0-9]+\]\s*/i, '');
                            
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setCustomToggles(prev => ({
                                    ...prev,
                                    [idx]: !isEnabled
                                  }));
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all text-[12.5px] font-mono cursor-pointer ${
                                  isEnabled
                                    ? 'border-[#FF0500] bg-[#FF0500]/10 text-white shadow-[0_0_8px_rgba(255,5,0,0.15)] font-bold'
                                    : 'border-[#FFB451]/20 bg-black/40 text-[#FFB451]/45 hover:border-[#FFB451]/45'
                                }`}
                                title={tooltipText}
                              >
                                <span className="truncate pr-1">{buttonText}</span>
                                <span className="shrink-0 text-[8px] px-1 py-0.2 rounded font-black uppercase tracking-wider bg-black/50">
                                  {isEnabled ? 'ON' : 'OFF'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Traveller Verification Settings Subsection */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                        <h3 className="text-[12px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-[#FFB451]" />
                          {t("Traveller Verification")}
                        </h3>
                        <p className="text-[12.5px] text-[#FFB451]/60 font-mono text-left">
                          {t("Enter your AGT Traveller Credentials to access restricted security records.")}
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#FFB451]/75 uppercase tracking-widest font-bold font-mono block">
                              {t("Traveller Name")}
                            </label>
                            <input
                              type="text"
                              maxLength={42}
                              value={settingsTravellerName}
                              onChange={(e) => setSettingsTravellerName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full bg-black/50 border-2 border-[#FFB451]/20 rounded-xl text-[12px] font-mono font-bold text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] transition-colors placeholder-[#FFB451]/30"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-[#FFB451]/75 uppercase tracking-widest font-bold font-mono block">
                              {t("AGT Traveller ID")}
                            </label>
                            <input
                              type="text"
                              value={settingsTravellerId}
                              onChange={(e) => setSettingsTravellerId(e.target.value)}
                              placeholder="e.g. 37411005-HN4T-7407"
                              className="w-full bg-black/50 border-2 border-[#FFB451]/20 rounded-xl text-[12px] font-mono font-bold text-[#FFB451] py-3.5 px-4 focus:outline-none focus:border-[#FF0500] transition-colors placeholder-[#FFB451]/30"
                            />
                          </div>
                        </div>

                        {savedTravellerName && (
                          <div className="text-[11.5px] font-mono text-green-500 flex items-center gap-2 bg-green-500/5 border border-green-500/20 p-2.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Verified: {savedTravellerName} (Level {savedSecurityLevel})
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleSaveSettingsCredentials}
                            disabled={isSettingsVerifying}
                            className="flex-1 py-3 bg-[#FF0500] hover:bg-[#FF0500]/85 border-2 border-[#FF0500] text-white rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.15)] disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isSettingsVerifying ? t("Verifying...") : t("Verify & Save Credentials")}
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleClearSettingsCredentials}
                            className="py-3 px-8 bg-[#161616] border-2 border-[#FF0500]/40 text-[#FFB451] hover:text-white hover:border-[#FF0500] rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-[#FF0500]/15 transition-all cursor-pointer"
                          >
                            {t("Clear Credentials")}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Audio Section */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between border-2 border-[#FF0500] p-5 rounded-xl bg-black/30">
                        <div className="space-y-1">
                          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                            <Volume2 className="w-3 h-3 text-[#FFB451]" />
                            {t("AGT Anthem")}
                          </h3>
                        </div>
                        <button 
                          onClick={() => setAudioEnabled(!audioEnabled)}
                          className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 transition-all text-[10px] uppercase tracking-widest font-black cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] ${
                            audioEnabled ? 'opacity-100' : 'opacity-60'
                          }`}
                        >
                          {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-white" /> : <VolumeX className="w-3.5 h-3.5 text-white" />}
                          {audioEnabled ? t('Active') : t('Muted')}
                        </button>
                      </div>
                    </div>

                    {/* Region DB Source Section (last setting) */}
                    <div className="col-span-1 md:col-span-2 pt-6 border-t border-white/5 space-y-4">
                      <div className="space-y-4 border-2 border-[#FF0500] p-5 rounded-xl bg-black/30 col-span-1 md:col-span-2">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#FFB451] flex items-center gap-2">
                          <Database className="w-3 h-3 text-[#FFB451]" />
                          {t("Multi-Tool DB Sync")}
                        </h3>
                        <div className="space-y-4">
                          <button 
                            onClick={fetchData}
                            className="w-full py-4 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-xl text-[10px] uppercase tracking-widest font-black hover:bg-[#FF0500]/85 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            {t("Re-Sync Multi-Tool Data")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Verification Overlay - Pop Up Box on top of the main display */}
          <AnimatePresence>
            {showVerificationModal && (
              <div 
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-[160] flex items-center justify-center p-4 pointer-events-auto"
                onClick={() => setShowVerificationModal(false)}
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="relative bg-[#0d0d0d] border-2 border-[#FF0500] rounded-2xl max-w-md w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center pb-4 border-b border-[#FF0500]/20 mb-5">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#FFB451] flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-[#FF0500]" />
                      {t("Verify Traveller ID")}
                    </h3>
                    <button 
                      onClick={() => setShowVerificationModal(false)}
                      className="px-4 py-2 bg-transparent text-[#FFB451]/60 hover:text-[#FFB451] rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] uppercase tracking-widest text-[#FFB451] block font-bold font-mono">
                        {t("Traveller Name")}
                      </label>
                      <input 
                        type="text"
                        maxLength={42}
                        value={travellerName}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9\s-_]/g, '');
                          setTravellerName(val);
                        }}
                        placeholder="e.g. Lorde Caelum"
                        className="w-full bg-black/50 border border-[#FFB451]/20 rounded-lg p-3 text-white text-xs font-mono focus:border-[#FF0500] outline-none transition-all placeholder:text-[#FFB451]/30"
                      />
                      <span className="text-[9px] text-[#FFB451]/40 block font-mono">Max 42 characters, alphanumeric.</span>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] uppercase tracking-widest text-[#FFB451] block font-bold font-mono">
                        {t("AGT Traveller ID")}
                      </label>
                      <input 
                        type="text"
                        value={travellerId}
                        onChange={(e) => {
                          setTravellerId(e.target.value.toUpperCase());
                        }}
                        placeholder="37411005-HN4T-7407"
                        className="w-full bg-black/50 border border-[#FFB451]/20 rounded-lg p-3 text-white text-xs font-mono focus:border-[#FF0500] outline-none transition-all placeholder:text-[#FFB451]/30"
                      />
                      <span className="text-[9px] text-[#FFB451]/40 block font-mono">Format: ########-????-####</span>
                    </div>

                    {verificationError && (
                      <div className="p-3.5 bg-[#FF0500]/10 border border-[#FF0500]/30 rounded-xl text-[11.5px] text-[#FFB451] text-left leading-relaxed font-mono">
                        {verificationError}
                      </div>
                    )}

                    <button 
                      onClick={verifyAndDownloadCsv}
                      disabled={isVerifying}
                      className="w-full py-3.5 mt-2 bg-[#FF0500] border-2 border-[#FF0500] text-white rounded-xl text-xs uppercase tracking-widest font-black hover:bg-[#FF0500]/85 transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)] disabled:opacity-40"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>{exportType === 'pdf' ? t("Verify & Download PDF") : t("Verify & Download CSV")}</span>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

            {/* Results Section - Full Width for Table */}
            <div className="w-full">
              <AnimatePresence mode="wait">
                {matchedRecords.length > 0 ? (
                  <motion.section
                    key="results"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="rounded-2xl overflow-hidden border-2 border-[#FF0500] shadow-[0_0_30px_rgba(255,5,0,0.15)] bg-black/40"
                  >
                    <div className="p-8 border-b border-[#FF0500]/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1.5">
                        <h3 className="text-xl font-medium text-[#FFB451] flex items-center gap-3">
                          {t("AGT Galactic Archives Results")}
                          <span className="px-2 py-0.5 rounded-full bg-[#FF0500]/10 text-[10px] text-[#FFB451] border border-[#FF0500]/45 font-mono">
                            {matchedRecords.length} {t("FOUND")}
                          </span>
                        </h3>
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-[#FF0500]/10 text-[10px] text-[#FFB451] border border-[#FF0500]/45 font-mono inline-block">
                            Classified Records Omitted: {omittedCount}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#FFB451] uppercase tracking-[0.2em]">{t("Verified Galactic Ledger Matches")}</p>
                      </div>
 
                      {/* Download and Export Buttons Preceding the Record List */}
                      <div className="flex flex-wrap items-center gap-3">
                        {reportType === 'Simple' && (
                          <button
                            onClick={downloadFullReportPdf}
                            className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t("Export PDF")}</span>
                          </button>
                        )}
                        <button
                          onClick={downloadFullReportCsv}
                          className="flex items-center gap-2 px-5 py-3 border-2 border-[#FF0500] bg-[#FF0500] text-white hover:bg-[#FF0500]/85 rounded-xl text-[10px] uppercase tracking-[0.15em] font-black transition-all active:scale-[0.98] cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t("Export CSV")}</span>
                        </button>
                      </div>
                    </div>
 
                    {/* Coordinated Top Scrollbar - Visible when horizontal scrolling is needed */}
                    {tableScrollWidth > containerWidth && (
                      <div 
                        ref={topScrollRef}
                        onScroll={handleTopScroll}
                        className="overflow-x-auto overflow-y-hidden custom-scrollbar bg-black/20 border-b border-[#FF0500]/10"
                        style={{ width: '100%' }}
                      >
                        <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
                      </div>
                    )}

                    <div 
                      ref={bottomScrollRef}
                      onScroll={handleBottomScroll}
                      className="overflow-x-auto overflow-y-auto max-h-[620px] custom-scrollbar relative"
                    >
                      <table ref={tableRef} className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#161616] border-b border-[#FF0500]/25 sticky top-0 z-20 shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            {columns.filter(col => col.enabled).map((col, idx) => {
                              const isSorted = sortColumn === col.name;
                              return (
                                <th 
                                  key={idx} 
                                  onClick={() => toggleSort(col.name)}
                                  className="py-3.5 px-4 text-[0.625rem] uppercase tracking-widest font-bold text-[#FFB451] whitespace-nowrap cursor-pointer hover:bg-[#FF0500]/10 hover:text-white transition-all group/th"
                                  title={`${t("Click to sort by")} ${t(col.name)}`}
                                >
                                  <div className="flex items-center gap-2 select-none">
                                    <span>{t(col.name)}</span>
                                    {isSorted ? (
                                      sortDirection === 'asc' ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-[#FF0500] shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-[#FF0500] shrink-0" />
                                      )
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-[#FFB451]/30 group-hover/th:text-[#FFB451]/60 shrink-0 transition-colors" />
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FF0500]/20">
                          {paginatedRecords.map((record, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors group">
                              {columns.filter(col => col.enabled).map((col, cIdx) => {
                                const val = record[col.name];
                                const isLinkCol = col.name === 'NMS Wiki Link' || String(col.name).toLowerCase().includes('wiki') || String(col.name).toLowerCase().includes('link');
                                const isValidUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
                                
                                return (
                                  <td key={cIdx} className="py-1.5 px-4 text-[0.71875rem] leading-none text-[#FFB451] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                    {isLinkCol && val && (isValidUrl || val.includes('.')) ? (
                                      <a 
                                        href={isValidUrl ? val : `https://${val}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-[#FF0500] hover:underline hover:text-[#FF0500]/80 font-black cursor-pointer"
                                      >
                                        {val}
                                      </a>
                                    ) : (
                                      val || <span className="text-[#FFB451]/40 italic">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-[#FF0500] bg-[#0c0c0c]">
                          <tr>
                            {columns.filter(col => col.enabled).map((col, idx) => {
                              const isTotalCol = col.name === 'Points' || col.name === columns[4]?.name;
                              const isFirstCol = idx === 0 || col.name === columns[0]?.name;
                              return (
                                <td key={idx} className="py-2 px-4 text-[0.6875rem] font-bold text-[#FFB451]">
                                  {isTotalCol ? (
                                    <span>{t("TOTAL:")} {totalPoints}</span>
                                  ) : isFirstCol ? (
                                    <span className="uppercase tracking-widest text-[0.625rem] text-[#FFB451] font-bold">{t("Number of Multi-Tools")}</span>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
 
                    {/* Pagination Interface (Exceeds 15 records) */}
                    {totalPages > 1 && (
                      <div className="py-3 px-8 border-t border-[#FF0500]/20 bg-[#FF0500]/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-mono text-[#FFB451] uppercase tracking-wider">
                          {t("Showing Page")} <span className="text-[#FFB451] font-bold decoration-2">{currentPage}</span> {t("of")} <span className="text-[#FFB451] font-bold">{totalPages}</span> ({matchedRecords.length || 0} {t("total rows")})
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("First")}
                          </button>
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("Prev")}
                          </button>
 
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                            const isNear = Math.abs(pg - currentPage) <= 1;
                            const isBoundary = pg === 1 || pg === totalPages;
                            if (!isNear && !isBoundary) {
                              if (pg === 2 || pg === totalPages - 1) {
                                return <span key={pg} className="text-[10px] text-[#FFB451]/30 font-mono px-0.5">...</span>;
                              }
                              return null;
                            }
                            return (
                              <button
                                key={pg}
                                onClick={() => setCurrentPage(pg)}
                                className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  currentPage === pg 
                                    ? 'bg-[#FF0500] text-white border-2 border-[#FF0500] shadow-[0_0_12px_rgba(255,5,0,0.45)] font-black' 
                                    : 'bg-black/30 border-2 border-[#FF0500] text-[#FFB451] hover:bg-[#FF0500]/15'
                                }`}
                              >
                                {pg}
                              </button>
                            );
                          })}
 
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("Next")}
                          </button>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className="px-2.5 py-1.5 rounded-lg border-2 border-[#FF0500] bg-[#FF0500] text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#FF0500]/85 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_0_10px_rgba(255,5,0,0.1)]"
                          >
                            {t("Last")}
                          </button>
                        </div>
                      </div>
                    )}
 
                    <div className="p-6 border-t border-[#FF0500]/20 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#FF0500]/[0.01]">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF0500] shadow-[0_0_8px_rgba(255,5,0,0.5)]"></div>
                          <span className="text-[9px] uppercase tracking-widest text-[#FFB451] font-bold">{t("Ledger Integrity: Verified")}</span>
                        </div>
                        <span className="text-[9px] font-mono text-[#FFB451] uppercase tracking-widest hidden md:inline">
                          {t("Index Reference:")} {Math.random().toString(16).substring(2, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.2em] font-mono text-[#FFB451]">
                        {t("AGT SECURE ARCHIVE CLIENT")}
                      </div>
                    </div>
                  </motion.section>
                ) : !loading && (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-32 flex flex-col items-center justify-center text-center space-y-6 border border-[#FFB451]/10 rounded-2xl bg-[#FFB451]/5"
                  >
                    <div className="w-16 h-16 rounded-full border border-[#FFB451]/10 flex items-center justify-center">
                      <Database className="w-6 h-6 text-[#FFB451]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#FFB451]">{t("Terminal Ready")}</p>
                      <p className="text-xs font-light text-[#FFB451]">{t("Report Generation Sequence Pending Civilization Selection")}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Area */}
      <footer className="bg-[#FFB451] mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col items-center gap-6 text-black">
          <div className="flex flex-wrap justify-center items-center gap-y-2 text-[10px] uppercase tracking-[0.2em] font-bold">
            <a href="https://www.nms-agt.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Home</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/about-the-agt" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">About</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/team" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Team</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/contribute" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Contribute</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/agt-galactic-archives" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Galactic Archives</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/engage" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Engage</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/agt-navi" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">AGT NAVI</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/terms" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Terms</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/support" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Support</a>
            <span className="ml-1 mr-2 text-black/40">|</span>
            <a href="https://www.nms-agt.com/terms/copyright" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">Copyright</a>
          </div>
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold">&copy; 2026 Alliance of Galactic Travellers</p>
        </div>
      </footer>

      {/* Extract Reports Loading Overlay */}
      <AnimatePresence>
        {isExtracting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4 pointer-events-auto"
          >
            <motion.img
              src="/AgtOfficialLogo.png"
              alt="AGT Official Logo"
              className="w-48 h-48 object-contain"
              initial={{ rotateY: 0, scale: 0.8 }}
              animate={{ rotateY: 360 * 3, scale: [0.8, 1.15, 0.8] }}
              exit={{ rotateY: 360 * 4, scale: 0, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.src !== window.location.origin + "/AGTIcon.png") {
                  img.src = "/AGTIcon.png";
                }
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[#FF0500] text-sm uppercase tracking-[0.25em] font-extrabold text-center mt-6"
            >
              {t("Processing Galactic Archive...")}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop Up Message Modal */}
      <AnimatePresence>
        {popupMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[210] flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative bg-[#0d0d0d] border-2 border-[#FF0500] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-5"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-[#FF0500]/10 flex items-center justify-center border border-[#FF0500]/30">
                <ShieldAlert className="w-6 h-6 text-[#FF0500]" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#FFB451]">
                  System Notification
                </h3>
                <p className="text-sm font-sans font-medium text-white/90">
                  {popupMessage}
                </p>
              </div>

              <button
                onClick={() => setPopupMessage(null)}
                className="w-full py-3 bg-[#FF0500] hover:bg-[#FF0500]/85 border-2 border-[#FF0500] text-white rounded-xl text-[10px] uppercase tracking-widest font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(255,5,0,0.25)] hover:shadow-[0_0_25px_rgba(255,5,0,0.45)]"
              >
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Audio */}
      <audio 
        ref={audioRef}
        src="/AGT Anthem (Instrumental).mp3"
        loop
        preload="auto"
      />
    </div>
  );
}


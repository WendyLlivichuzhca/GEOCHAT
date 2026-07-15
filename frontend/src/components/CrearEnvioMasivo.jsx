import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Check,
  Smile,
  Bold,
  Italic,
  ChevronDown,
  X,
  Filter,
  Tag,
  Globe,
  CalendarDays,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const MESSAGE_MAX_LENGTH = 4000;

const buildAuthHeaders = (user, extraHeaders = {}) => {
  const headers = { ...extraHeaders };
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const CrearEnvioMasivo = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3

  // Form State
  const [nombre, setNombre] = useState('');
  const [dispositivoId, setDispositivoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [urlMedia, setUrlMedia] = useState('');
  const [mediaType, setMediaType] = useState(''); // 'image' or 'video'
  const [targetType, setTargetType] = useState('all'); // 'all', 'tags'
  const [selectedTags, setSelectedTags] = useState([]);
  const [envioTipo, setEnvioTipo] = useState('ahora'); // 'ahora', 'programar'
  const [fechaEnvio, setFechaEnvio] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [horaEnvio, setHoraEnvio] = useState('12:00');
  const [velocidadEnvio, setVelocidadEnvio] = useState('lento');
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [scheduleMonth, setScheduleMonth] = useState(new Date());

  // --- NEW Step 2 Filter State ---
  // filterPanelOpen: null | 'menu' | 'tags' | 'pais' | 'fecha'
  const [filterPanelOpen, setFilterPanelOpen] = useState(null);
  // Tags filter sub-state
  const [tagOperation, setTagOperation] = useState('contiene_algunos'); // 'contiene_algunos' | 'contiene_todos' | 'excluir'
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  // Pais filter sub-state
  const [paisDropdownOpen, setPaisDropdownOpen] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');
  // Fecha filter sub-state
  const [fechaPeriod, setFechaPeriod] = useState(''); // 'hoy' | 'ultimos3' | 'ultimos7' | 'ultimos14' | 'ultimos30' | 'personalizado'
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarStartDate, setCalendarStartDate] = useState(null);
  const [calendarEndDate, setCalendarEndDate] = useState(null);
  const filterPanelRef = useRef(null);
  const schedulePickerRef = useRef(null);

  // API Options State
  const [devices, setDevices] = useState([]);
  const [tags, setTags] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Custom Dropdown State
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceSelectRef = useRef(null);

  // Media Upload Refs and State
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Preview Count State
  const [previewCount, setPreviewCount] = useState(0);
  const [previewContacts, setPreviewContacts] = useState([]);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);

  // Action State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Close filter panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        // Only close if clicking truly outside
        const addFilterBtn = document.getElementById('add-filter-btn');
        if (addFilterBtn && addFilterBtn.contains(e.target)) return;
        setFilterPanelOpen(null);
        setTagDropdownOpen(false);
        setTagSearch('');
        setPaisDropdownOpen(false);
      }
      if (schedulePickerRef.current && !schedulePickerRef.current.contains(e.target)) {
        setSchedulePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Countries list
  const COUNTRIES = [
    { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
    { code: 'AE', name: 'Emiratos Árabes', flag: '🇦🇪' },
    { code: 'AG', name: 'Antigua y Barbuda', flag: '🇦🇬' },
    { code: 'AI', name: 'Anguila', flag: '🇦🇮' },
    { code: 'AL', name: 'Albania', flag: '🇦🇱' },
    { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
    { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'AT', name: 'Austria', flag: '🇦🇹' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'AZ', name: 'Azerbaiyán', flag: '🇦🇿' },
    { code: 'BA', name: 'Bosnia Herzegovina', flag: '🇧🇦' },
    { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'BH', name: 'Baréin', flag: '🇧🇭' },
    { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
    { code: 'BJ', name: 'Benín', flag: '🇧🇯' },
    { code: 'BN', name: 'Brunéi', flag: '🇧🇳' },
    { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
    { code: 'BT', name: 'Bután', flag: '🇧🇹' },
    { code: 'BW', name: 'Botsuana', flag: '🇧🇼' },
    { code: 'BY', name: 'Bielorrusia', flag: '🇧🇾' },
    { code: 'BZ', name: 'Belice', flag: '🇧🇿' },
    { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
    { code: 'CD', name: 'Congo (RDC)', flag: '🇨🇩' },
    { code: 'CF', name: 'Rep. Centroafricana', flag: '🇨🇫' },
    { code: 'CG', name: 'Congo', flag: '🇨🇬' },
    { code: 'CH', name: 'Suiza', flag: '🇨🇭' },
    { code: 'CI', name: 'Costa de Marfil', flag: '🇨🇮' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CM', name: 'Camerún', flag: '🇨🇲' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
    { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
    { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
    { code: 'CY', name: 'Chipre', flag: '🇨🇾' },
    { code: 'CZ', name: 'Rep. Checa', flag: '🇨🇿' },
    { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
    { code: 'DJ', name: 'Yibuti', flag: '🇩🇯' },
    { code: 'DK', name: 'Dinamarca', flag: '🇩🇰' },
    { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
    { code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴' },
    { code: 'DZ', name: 'Argelia', flag: '🇩🇿' },
    { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
    { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
    { code: 'EG', name: 'Egipto', flag: '🇪🇬' },
    { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
    { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'ET', name: 'Etiopía', flag: '🇪🇹' },
    { code: 'FI', name: 'Finlandia', flag: '🇫🇮' },
    { code: 'FJ', name: 'Fiyi', flag: '🇫🇯' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷' },
    { code: 'GA', name: 'Gabón', flag: '🇬🇦' },
    { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
    { code: 'GD', name: 'Granada', flag: '🇬🇩' },
    { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
    { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
    { code: 'GQ', name: 'Guinea Ecuatorial', flag: '🇬🇶' },
    { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
    { code: 'GW', name: 'Guinea-Bisáu', flag: '🇬🇼' },
    { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
    { code: 'HR', name: 'Croacia', flag: '🇭🇷' },
    { code: 'HT', name: 'Haití', flag: '🇭🇹' },
    { code: 'HU', name: 'Hungría', flag: '🇭🇺' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'IQ', name: 'Irak', flag: '🇮🇶' },
    { code: 'IR', name: 'Irán', flag: '🇮🇷' },
    { code: 'IS', name: 'Islandia', flag: '🇮🇸' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹' },
    { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
    { code: 'JO', name: 'Jordania', flag: '🇯🇴' },
    { code: 'JP', name: 'Japón', flag: '🇯🇵' },
    { code: 'KE', name: 'Kenia', flag: '🇰🇪' },
    { code: 'KG', name: 'Kirguistán', flag: '🇰🇬' },
    { code: 'KH', name: 'Camboya', flag: '🇰🇭' },
    { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
    { code: 'KM', name: 'Comoras', flag: '🇰🇲' },
    { code: 'KN', name: 'San Cristóbal y Nieves', flag: '🇰🇳' },
    { code: 'KP', name: 'Corea del Norte', flag: '🇰🇵' },
    { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'KZ', name: 'Kazajistán', flag: '🇰🇿' },
    { code: 'LA', name: 'Laos', flag: '🇱🇦' },
    { code: 'LB', name: 'Líbano', flag: '🇱🇧' },
    { code: 'LC', name: 'Santa Lucía', flag: '🇱🇨' },
    { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
    { code: 'LS', name: 'Lesoto', flag: '🇱🇸' },
    { code: 'LT', name: 'Lituania', flag: '🇱🇹' },
    { code: 'LU', name: 'Luxemburgo', flag: '🇱🇺' },
    { code: 'LV', name: 'Letonia', flag: '🇱🇻' },
    { code: 'LY', name: 'Libia', flag: '🇱🇾' },
    { code: 'MA', name: 'Marruecos', flag: '🇲🇦' },
    { code: 'MC', name: 'Mónaco', flag: '🇲🇨' },
    { code: 'MD', name: 'Moldavia', flag: '🇲🇩' },
    { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
    { code: 'MK', name: 'Macedonia del Norte', flag: '🇲🇰' },
    { code: 'ML', name: 'Malí', flag: '🇲🇱' },
    { code: 'MM', name: 'Birmania', flag: '🇲🇲' },
    { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
    { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
    { code: 'MT', name: 'Malta', flag: '🇲🇹' },
    { code: 'MU', name: 'Mauricio', flag: '🇲🇺' },
    { code: 'MV', name: 'Maldivas', flag: '🇲🇻' },
    { code: 'MW', name: 'Malaui', flag: '🇲🇼' },
    { code: 'MX', name: 'México', flag: '🇲🇽' },
    { code: 'MY', name: 'Malasia', flag: '🇲🇾' },
    { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
    { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
    { code: 'NE', name: 'Níger', flag: '🇳🇪' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
    { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
    { code: 'NO', name: 'Noruega', flag: '🇳🇴' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
    { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
    { code: 'NZ', name: 'Nueva Zelanda', flag: '🇳🇿' },
    { code: 'OM', name: 'Omán', flag: '🇴🇲' },
    { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪' },
    { code: 'PG', name: 'Papúa Nueva Guinea', flag: '🇵🇬' },
    { code: 'PH', name: 'Filipinas', flag: '🇵🇭' },
    { code: 'PK', name: 'Pakistán', flag: '🇵🇰' },
    { code: 'PL', name: 'Polonia', flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'PW', name: 'Palaos', flag: '🇵🇼' },
    { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
    { code: 'QA', name: 'Catar', flag: '🇶🇦' },
    { code: 'RO', name: 'Rumanía', flag: '🇷🇴' },
    { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
    { code: 'RU', name: 'Rusia', flag: '🇷🇺' },
    { code: 'RW', name: 'Ruanda', flag: '🇷🇼' },
    { code: 'SA', name: 'Arabia Saudita', flag: '🇸🇦' },
    { code: 'SB', name: 'Islas Salomón', flag: '🇸🇧' },
    { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
    { code: 'SD', name: 'Sudán', flag: '🇸🇩' },
    { code: 'SE', name: 'Suecia', flag: '🇸🇪' },
    { code: 'SG', name: 'Singapur', flag: '🇸🇬' },
    { code: 'SI', name: 'Eslovenia', flag: '🇸🇮' },
    { code: 'SK', name: 'Eslovaquia', flag: '🇸🇰' },
    { code: 'SL', name: 'Sierra Leona', flag: '🇸🇱' },
    { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
    { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
    { code: 'SR', name: 'Surinam', flag: '🇸🇷' },
    { code: 'SS', name: 'Sudán del Sur', flag: '🇸🇸' },
    { code: 'ST', name: 'Santo Tomé y Príncipe', flag: '🇸🇹' },
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
    { code: 'SY', name: 'Siria', flag: '🇸🇾' },
    { code: 'SZ', name: 'Esuatini', flag: '🇸🇿' },
    { code: 'TD', name: 'Chad', flag: '🇹🇩' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬' },
    { code: 'TH', name: 'Tailandia', flag: '🇹🇭' },
    { code: 'TJ', name: 'Tayikistán', flag: '🇹🇯' },
    { code: 'TL', name: 'Timor Oriental', flag: '🇹🇱' },
    { code: 'TM', name: 'Turkmenistán', flag: '🇹🇲' },
    { code: 'TN', name: 'Túnez', flag: '🇹🇳' },
    { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
    { code: 'TR', name: 'Turquía', flag: '🇹🇷' },
    { code: 'TT', name: 'Trinidad y Tobago', flag: '🇹🇹' },
    { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
    { code: 'UA', name: 'Ucrania', flag: '🇺🇦' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
    { code: 'UZ', name: 'Uzbekistán', flag: '🇺🇿' },
    { code: 'VA', name: 'Vaticano', flag: '🇻🇦' },
    { code: 'VC', name: 'San Vicente y Granadinas', flag: '🇻🇨' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
    { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
    { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
    { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
    { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
    { code: 'ZA', name: 'Sudáfrica', flag: '🇿🇦' },
    { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabue', flag: '🇿🇼' },
  ];

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q));
  }, [countrySearch]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter(tag => (tag.nombre || '').toLowerCase().includes(q));
  }, [tags, tagSearch]);

  // Calendar helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    let firstDay = getFirstDayOfMonth(year, month);
    // Make week start on Monday (0=Mon...6=Sun)
    firstDay = (firstDay + 6) % 7;
    const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dayNames = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];

    // Build grid: prev month overflow + current month + next month overflow
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const cells = [];
    // Days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, type: 'prev' });
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, type: 'current' });
    }
    // Fill remaining cells with next month days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'next' });
    }

    const getDateForCell = (cell) => {
      if (cell.type === 'prev') return new Date(year, month - 1, cell.day);
      if (cell.type === 'next') return new Date(year, month + 1, cell.day);
      return new Date(year, month, cell.day);
    };

    const isSelected = (cell) => {
      if (cell.type !== 'current') return false;
      const date = getDateForCell(cell);
      if (calendarStartDate && calendarEndDate) {
        return date >= calendarStartDate && date <= calendarEndDate;
      }
      if (calendarStartDate) return date.getTime() === calendarStartDate.getTime();
      return false;
    };
    const isStart = (cell) => {
      if (cell.type !== 'current' || !calendarStartDate) return false;
      return getDateForCell(cell).getTime() === calendarStartDate.getTime();
    };
    const isEnd = (cell) => {
      if (cell.type !== 'current' || !calendarEndDate) return false;
      return getDateForCell(cell).getTime() === calendarEndDate.getTime();
    };
    const isToday = (cell) => {
      if (cell.type !== 'current') return false;
      const today = new Date();
      return cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
      <div className="min-w-[200px]">
        {/* Calendar header with year + month navigation */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setCalendarMonth(new Date(year - 1, month, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">«</button>
            <button type="button" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">‹</button>
          </div>
          <span className="text-[11px] font-bold text-slate-700 capitalize">{monthNames[month]} {year}</span>
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">›</button>
            <button type="button" onClick={() => setCalendarMonth(new Date(year + 1, month, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">»</button>
          </div>
        </div>
        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map(d => <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>)}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (cell.type !== 'current') return;
                const clicked = getDateForCell(cell);
                if (!calendarStartDate || (calendarStartDate && calendarEndDate)) {
                  setCalendarStartDate(clicked);
                  setCalendarEndDate(null);
                } else {
                  if (clicked < calendarStartDate) {
                    setCalendarStartDate(clicked);
                    setCalendarEndDate(null);
                  } else {
                    setCalendarEndDate(clicked);
                  }
                }
              }}
              className={`h-6 w-full text-[10px] font-semibold rounded transition ${
                cell.type !== 'current' ? 'text-slate-300 cursor-default' :
                isStart(cell) || isEnd(cell) ? 'bg-[#5c5dfb] text-white' :
                isSelected(cell) ? 'bg-sky-100 text-[#5c5dfb]' :
                isToday(cell) ? 'border border-[#5c5dfb] text-[#5c5dfb]' :
                'text-slate-700 hover:bg-slate-100'
              }`}
            >{cell.day}</button>
          ))}
        </div>
      </div>
    );
  };

  const handleScheduleDateClick = (clickedDate) => {
    const y = clickedDate.getFullYear();
    const m = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const d = String(clickedDate.getDate()).padStart(2, '0');
    setFechaEnvio(`${y}-${m}-${d}`);
  };

  const renderScheduleCalendar = () => {
    const year = scheduleMonth.getFullYear();
    const month = scheduleMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    let firstDay = getFirstDayOfMonth(year, month);
    firstDay = (firstDay + 6) % 7;
    const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dayNames = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];

    const prevMonthDays = getDaysInMonth(year, month - 1);
    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, type: 'prev' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, type: 'current' });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'next' });
    }

    const getDateForCell = (cell) => {
      if (cell.type === 'prev') return new Date(year, month - 1, cell.day);
      if (cell.type === 'next') return new Date(year, month + 1, cell.day);
      return new Date(year, month, cell.day);
    };

    const isSelected = (cell) => {
      if (cell.type !== 'current') return false;
      if (!fechaEnvio) return false;
      const date = getDateForCell(cell);
      const parts = fechaEnvio.split('-');
      if (parts.length !== 3) return false;
      const selY = Number(parts[0]);
      const selM = Number(parts[1]) - 1;
      const selD = Number(parts[2]);
      return date.getFullYear() === selY && date.getMonth() === selM && date.getDate() === selD;
    };

    const isToday = (cell) => {
      if (cell.type !== 'current') return false;
      const today = new Date();
      return cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
      <div className="min-w-[200px] select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setScheduleMonth(new Date(year - 1, month, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">«</button>
            <button type="button" onClick={() => setScheduleMonth(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">‹</button>
          </div>
          <span className="text-[11px] font-bold text-slate-700 capitalize">{monthNames[month]} {year}</span>
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setScheduleMonth(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">›</button>
            <button type="button" onClick={() => setScheduleMonth(new Date(year + 1, month, 1))} className="p-1 rounded hover:bg-slate-100 text-slate-500 font-bold text-[11px]">»</button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map(d => <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (cell.type !== 'current') return;
                const clicked = getDateForCell(cell);
                handleScheduleDateClick(clicked);
              }}
              className={`h-6 w-full text-[10px] font-semibold rounded transition ${
                cell.type !== 'current' ? 'text-slate-300 cursor-default' :
                isSelected(cell) ? 'bg-[#5c5dfb] text-white' :
                isToday(cell) ? 'border border-[#5c5dfb] text-[#5c5dfb]' :
                'text-slate-700 hover:bg-slate-100'
              }`}
            >{cell.day}</button>
          ))}
        </div>
      </div>
    );
  };


  // Add filter helper
  const handleAddFilter = (type) => {
    if (type === 'tags') {
      setTargetType('tags');
      // Already using selectedTags for API
      setTagDropdownOpen(false);
      setPaisDropdownOpen(false);
    } else if (type === 'pais') {
      setCountrySearch('');
      setTagDropdownOpen(false);
      setPaisDropdownOpen(true);
    } else if (type === 'fecha') {
      setFechaPeriod('');
      setCalendarStartDate(null);
      setCalendarEndDate(null);
      setTagDropdownOpen(false);
      setPaisDropdownOpen(false);
    }
    setFilterPanelOpen(type);
  };

  // Close device dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (deviceSelectRef.current && !deviceSelectRef.current.contains(e.target)) {
        setIsDeviceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatDeviceLabel = (dev) => {
    if (!dev) return 'Seleccionar dispositivo';
    if (!dev.numero_telefono) return dev.nombre;
    const cleanNum = dev.numero_telefono.replace(/\D/g, '');
    const last4 = cleanNum.slice(-4);
    return `${dev.nombre} (${last4})`;
  };

  const handleUploadFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('El archivo supera el límite de 50MB.');
      return;
    }

    setIsUploadingMedia(true);
    setErrorMsg('');
    try {
      const payload = new FormData();
      payload.append('file', file);

      const response = await fetch(`${API_URL}/api/envios_masivos/upload-media?user_id=${user.id}`, {
        method: 'POST',
        headers: buildAuthHeaders(user),
        body: payload
      });

      const result = await response.json();
      if (result.success && result.url) {
        setUrlMedia(result.url);
        setMediaType(result.media_type || type);
        if (mensaje.length > 1024) {
          setMensaje(mensaje.substring(0, 1024));
        }
      } else {
        setErrorMsg(result.message || 'Error al subir el archivo.');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setErrorMsg('Error de conexión al subir el archivo.');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  // 1. Fetch options
  useEffect(() => {
    const fetchOptions = async () => {
      if (!user?.id) return;
      setLoadingOptions(true);
      try {
        const schedResp = await fetch(`${API_URL}/api/scheduled_messages/options?user_id=${user.id}`, {
          headers: buildAuthHeaders(user)
        });
        const schedData = await schedResp.json();
        if (schedData.success && schedData.data) {
          setDevices(schedData.data.devices || []);
          if (schedData.data.devices?.length > 0) {
            setDispositivoId(schedData.data.devices[0].id);
          }
        }

        const tagsResp = await fetch(`${API_URL}/api/tags?user_id=${user.id}`, {
          headers: buildAuthHeaders(user)
        });
        const tagsData = await tagsResp.json();
        if (Array.isArray(tagsData)) {
          setTags(tagsData);
        } else if (tagsData.success && Array.isArray(tagsData.tags)) {
          setTags(tagsData.tags);
        } else if (tagsData.success && Array.isArray(tagsData.data)) {
          setTags(tagsData.data);
        }
      } catch (err) {
        console.error('Error fetching creation options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [user]);

  // 2. Fetch preview count
  useEffect(() => {
    const fetchPreviewCount = async () => {
      if (!dispositivoId || !user?.id) {
        setPreviewCount(0);
        setPreviewContacts([]);
        return;
      }

      setLoadingCount(true);
      try {
        const payload = {
          dispositivo_id: Number(dispositivoId),
          targets: {
            type: targetType,
            tag_ids: selectedTags,
            tag_op: tagOperation,
            countries: selectedCountries,
            fecha_period: fechaPeriod,
            fecha_inicio: calendarStartDate ? calendarStartDate.toISOString().split('T')[0] : null,
            fecha_fin: calendarEndDate ? calendarEndDate.toISOString().split('T')[0] : null
          }
        };

        const resp = await fetch(`${API_URL}/api/envios_masivos/preview_count?user_id=${user.id}`, {
          method: 'POST',
          headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.success) {
          setPreviewCount(result.count || 0);
          setPreviewContacts(result.contacts || []);
        } else {
          setPreviewCount(0);
          setPreviewContacts([]);
        }
      } catch (err) {
        console.error('Error fetching preview count:', err);
        setPreviewCount(0);
        setPreviewContacts([]);
      } finally {
        setLoadingCount(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchPreviewCount();
    }, 300);

    return () => clearTimeout(timeout);
  }, [dispositivoId, targetType, selectedTags, tagOperation, selectedCountries, fechaPeriod, calendarStartDate, calendarEndDate, user]);

  const handleTagToggle = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleInsertVariable = (variable) => {
    setMensaje((prev) => `${prev}${variable}`);
  };

  // Upload/Mock Media triggers
  const handleSelectMediaMock = (type) => {
    setMediaType(type);
    if (type === 'image') {
      setUrlMedia('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop');
    } else {
      setUrlMedia('https://www.w3schools.com/html/mov_bbb.mp4');
    }
    if (mensaje.length > 1024) {
      setMensaje(mensaje.substring(0, 1024));
    }
  };

  const handleRemoveMedia = () => {
    setUrlMedia('');
    setMediaType('');
  };

  // Submit campaign to API
  const handleCreateCampaign = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!nombre.trim()) {
      setErrorMsg('Por favor escribe un nombre para la campaña.');
      return;
    }
    if (!dispositivoId) {
      setErrorMsg('Por favor selecciona una terminal.');
      return;
    }
    if (!mensaje.trim() && !urlMedia) {
      setErrorMsg('Agrega un mensaje, imagen o video para continuar.');
      return;
    }
    if (targetType === 'tags' && selectedTags.length === 0) {
      setErrorMsg('Debes seleccionar al menos una etiqueta.');
      return;
    }
    if (envioTipo === 'programar' && (!fechaEnvio || !horaEnvio)) {
      setErrorMsg('Por favor especifica la fecha y hora de programación.');
      return;
    }
    if (envioTipo === 'programar' && new Date(`${fechaEnvio}T${horaEnvio}:00`) <= new Date()) {
      setErrorMsg('La fecha y hora programada debe ser posterior al momento actual.');
      return;
    }

    setIsSaving(true);
    try {
      let programadoPara = null;
      if (envioTipo === 'programar') {
        programadoPara = `${fechaEnvio}T${horaEnvio}:00`;
      }

      const payload = {
        nombre,
        dispositivo_id: Number(dispositivoId),
        mensaje: mensaje.trim(),
        url_media: urlMedia.trim() || null,
        media_type: mediaType || null,
        velocidad_envio: velocidadEnvio,
        programado_para: programadoPara,
        targets: {
          type: targetType,
          tag_ids: selectedTags,
          tag_op: tagOperation,
          countries: selectedCountries,
          fecha_period: fechaPeriod,
          fecha_inicio: calendarStartDate ? calendarStartDate.toISOString().split('T')[0] : null,
          fecha_fin: calendarEndDate ? calendarEndDate.toISOString().split('T')[0] : null
        }
      };

      const resp = await fetch(`${API_URL}/api/envios_masivos?user_id=${user.id}`, {
          method: 'POST',
          headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
      const result = await resp.json();

      if (result.success) {
        setSuccessMsg(result.message || 'Campaña guardada con éxito.');
        setTimeout(() => {
          navigate('/envios-masivos');
        }, 1500);
      } else {
        setErrorMsg(result.message || 'Error al guardar la campaña.');
      }
    } catch (err) {
      console.error('Error submitting campaign:', err);
      setErrorMsg('Error de red. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const formattedPreviewText = useMemo(() => {
    let text = escapeHtml(mensaje || 'Tu mensaje aparecerá aquí. Escribe algo en el editor...');
    text = text.replace(/{nombre}/g, 'Wendy Llivichuzhca');
    text = text.replace(/{name}/g, 'Wendy Llivichuzhca');
    text = text.replace(/{telefono}/g, '+593986038755');
    text = text.replace(/{phone}/g, '+593986038755');

    text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    text = text.replace(/~(.*?)~/g, '<del>$1</del>');

    return text;
  }, [mensaje]);

  const selectedDeviceName = useMemo(() => {
    const dev = devices.find((d) => String(d.id) === String(dispositivoId));
    return dev ? `${dev.nombre} (${dev.numero_telefono || 'Sin número'})` : 'Seleccionar dispositivo';
  }, [devices, dispositivoId]);

  // Color dot helper based on state
  const getDeviceStatusColor = (estado) => {
    if (estado === 'conectado') return 'bg-emerald-500';
    if (estado === 'conectando') return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const hasActiveFilters = useMemo(() => {
    return (
      (targetType === 'tags' && selectedTags.length > 0) ||
      selectedCountries.length > 0 ||
      !!fechaPeriod
    );
  }, [targetType, selectedTags, selectedCountries, fechaPeriod]);

  const getDateLabel = () => {
    if (fechaPeriod === 'hoy') return 'Hoy';
    if (fechaPeriod === 'ultimos3') return 'Últimos 3 días';
    if (fechaPeriod === 'ultimos7') return 'Últimos 7 días';
    if (fechaPeriod === 'ultimos14') return 'Últimos 14 días';
    if (fechaPeriod === 'ultimos30') return 'Últimos 30 días';
    if (fechaPeriod === 'personalizado') {
      if (calendarStartDate && calendarEndDate) {
        const startStr = calendarStartDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endStr = calendarEndDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${startStr} - ${endStr}`;
      }
      if (calendarStartDate) {
        return calendarStartDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      return 'Fecha personalizada';
    }
    return '';
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setSelectedCountries([]);
    setFechaPeriod('');
    setCalendarStartDate(null);
    setCalendarEndDate(null);
    setTargetType('all');
    setTagSearch('');
    setCountrySearch('');
    setFilterPanelOpen(null);
    setTagDropdownOpen(false);
    setPaisDropdownOpen(false);
  };

  const stepValid = useMemo(() => {
    if (currentStep === 1) {
      return nombre.trim() !== '' && dispositivoId !== '' && (mensaje.trim() !== '' || urlMedia !== '');
    }
    if (currentStep === 2) {
      return !loadingCount && previewCount > 0;
    }
    return true;
  }, [currentStep, nombre, dispositivoId, mensaje, urlMedia, loadingCount, previewCount]);

  const maxLimit = urlMedia ? 1024 : 4000;

  const formatScheduledDateTime = () => {
    if (!fechaEnvio) return 'Seleccionar fecha y hora';
    const parts = fechaEnvio.split('-');
    if (parts.length !== 3) return 'Seleccionar fecha y hora';
    const day = parts[2];
    const month = parts[1];
    const year = parts[0];
    return `${day}/${month}/${year} ${horaEnvio || '12:00'}`;
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7 flex flex-col">
          
          {/* Header */}
          <div className="mb-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  navigate('/envios-masivos');
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="text-sm font-semibold text-[#5c5dfb] hover:underline cursor-pointer" onClick={() => navigate('/envios-masivos')}>
                Regresar
              </span>
              <h1 className="text-[1.8rem] font-bold tracking-[-0.03em] text-slate-900 leading-tight">
                Crear envío masivo a contactos
              </h1>
            </div>
          </div>

          {/* Step Wizard Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-100 rounded-3xl bg-white shadow-sm overflow-hidden mb-8">
            {/* Step 1 */}
            <div
              className={`p-5 flex items-center gap-4 relative transition cursor-pointer ${
                currentStep === 1 ? 'bg-sky-50/10' : ''
              }`}
              onClick={() => setCurrentStep(1)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-colors ${
                  currentStep === 1 || (nombre && dispositivoId && (mensaje || urlMedia))
                    ? 'border-[#5c5dfb] bg-white text-[#5c5dfb]'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {currentStep > 1 && nombre && dispositivoId && (mensaje || urlMedia) ? <Check size={16} /> : '01'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Enviar mensaje</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona una plantilla o crea un mensaje nuevo
                </p>
              </div>
              {currentStep === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#5c5dfb]" />
              )}
            </div>

            {/* Step 2 */}
            <div
              className={`p-5 flex items-center gap-4 relative border-t md:border-t-0 md:border-l border-slate-100 transition cursor-pointer ${
                currentStep === 2 ? 'bg-sky-50/10' : ''
              }`}
              onClick={() => {
                if (nombre && dispositivoId && (mensaje || urlMedia)) {
                  setCurrentStep(2);
                }
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-colors ${
                  currentStep === 2 || (currentStep > 2 && stepValid)
                    ? 'border-[#5c5dfb] bg-white text-[#5c5dfb]'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {currentStep > 2 && stepValid ? <Check size={16} /> : '02'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Seleccionar audiencia</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona los contactos que recibirán el envío masivo
                </p>
              </div>
              {currentStep === 2 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#5c5dfb]" />
              )}
            </div>

            {/* Step 3 */}
            <div
              className={`p-5 flex items-center gap-4 relative border-t md:border-t-0 md:border-l border-slate-100 transition cursor-pointer ${
                currentStep === 3 ? 'bg-sky-50/10' : ''
              }`}
              onClick={() => {
                if (nombre && dispositivoId && (mensaje || urlMedia) && stepValid) {
                  setCurrentStep(3);
                }
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-colors ${
                  currentStep === 3
                    ? 'border-[#5c5dfb] bg-white text-[#5c5dfb]'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {currentStep === 3 ? <Check size={16} /> : '03'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Programar envío</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona una fecha y hora para el envío
                </p>
              </div>
              {currentStep === 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#5c5dfb]" />
              )}
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-8 flex-1 ${currentStep === 1 ? 'lg:grid-cols-[1.5fr_1fr]' : ''}`}>
            
            {/* Left Hand Form Area */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                
                {/* Alert Box */}
                {errorMsg && (
                  <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-semibold">
                    <AlertCircle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-700 text-sm font-semibold">
                    <CheckCircle2 size={18} />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* STEP 1: ENVIAR MENSAJE */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Nombre input */}
                    <div>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del envío masivo"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-[#5c5dfb] focus:ring-1 focus:ring-[#5c5dfb] transition"
                        required
                      />
                    </div>

                    {/* Dispositivo dropdown */}
                    <div className="relative" ref={deviceSelectRef}>
                      <button
                        type="button"
                        onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#5c5dfb] focus:ring-1 focus:ring-[#5c5dfb] transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {dispositivoId ? (
                            <>
                              <span
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getDeviceStatusColor(
                                  devices.find((d) => String(d.id) === String(dispositivoId))?.estado
                                )}`}
                              />
                              <span className="text-slate-800 truncate">
                                {formatDeviceLabel(devices.find((d) => String(d.id) === String(dispositivoId)))}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Seleccionar dispositivo</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {dispositivoId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDispositivoId('');
                                setIsDeviceDropdownOpen(false);
                              }}
                              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <div className="h-5 w-[1px] bg-slate-200 mx-2" />
                          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isDeviceDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isDeviceDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {devices.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center font-medium">No hay dispositivos disponibles</div>
                          ) : (
                            devices.map((dev) => (
                              <button
                                key={dev.id}
                                type="button"
                                onClick={() => {
                                  setDispositivoId(dev.id);
                                  setIsDeviceDropdownOpen(false);
                                }}
                                className={`flex h-11 w-full items-center px-4 gap-3 text-sm font-semibold transition text-left ${
                                  String(dispositivoId) === String(dev.id)
                                    ? 'bg-sky-50/50 text-[#5c5dfb]'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getDeviceStatusColor(dev.estado)}`} />
                                <span className="truncate">{formatDeviceLabel(dev)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message composing (Conditional on Device Selection) */}
                    {dispositivoId && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Crea un nuevo mensaje
                          </span>
                        </div>

                        {/* Yellow Warning Box */}
                        <div className="rounded-xl bg-[#fffbeb] border border-[#fcd34d] p-4 text-[#92400e] text-xs font-semibold leading-relaxed">
                          Evita enviar difusiones masivas a contactos que podrían considerar el mensaje como spam, para evitar que WhatsApp bloquee tu número.
                        </div>

                        {/* Media Upload Area */}
                        {isUploadingMedia ? (
                          <div className="flex border-2 border-dashed border-sky-200 rounded-2xl h-24 bg-white items-center justify-center gap-3 text-slate-500 text-xs font-bold animate-in fade-in duration-200">
                            <Loader2 size={20} className="animate-spin text-[#5c5dfb]" />
                            <span>Subiendo archivo...</span>
                          </div>
                        ) : !urlMedia ? (
                          <div className="mx-auto flex border-2 border-dashed border-sky-200 rounded-2xl overflow-hidden h-24 bg-white max-w-[240px]">
                            <button
                              type="button"
                              onClick={() => imageInputRef.current.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 hover:bg-sky-50/20 transition text-xs font-bold text-slate-500"
                            >
                              <ImageIcon size={20} className="text-[#5c5dfb]" />
                              Imagen
                            </button>
                            <div className="w-[0px] border-r border-dashed border-sky-200 my-4" />
                            <button
                              type="button"
                              onClick={() => videoInputRef.current.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 hover:bg-sky-50/20 transition text-xs font-bold text-slate-500"
                            >
                              <VideoIcon size={20} className="text-[#5c5dfb]" />
                              Video
                            </button>
                          </div>
                        ) : (
                          <div className="relative mx-auto rounded-2xl overflow-hidden border border-slate-100 max-w-[240px] h-32 bg-slate-50 flex items-center justify-center shadow-sm">
                            {mediaType === 'image' ? (
                              <img src={urlMedia} alt="Media" className="w-full h-full object-cover" />
                            ) : (
                              <video src={urlMedia} className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveMedia}
                              className="absolute top-2 left-2 h-7 w-7 rounded-full bg-[#5c5dfb] hover:bg-[#4748db] text-white flex items-center justify-center shadow-md transition z-10"
                              title="Eliminar archivo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}

                        {/* Text editor box */}
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
                          <textarea
                            rows={6}
                            value={mensaje}
                            onChange={(e) => {
                              if (e.target.value.length <= maxLimit) {
                                setMensaje(e.target.value);
                              }
                            }}
                            placeholder="Escribe un mensaje..."
                            className="w-full bg-transparent p-4 text-[14px] leading-relaxed outline-none border-none resize-none"
                            required
                          />

                          {/* Editor Toolbar */}
                          <div className="border-t border-slate-100 px-4 py-2.5 flex justify-between items-center bg-white text-slate-400 text-sm">
                            <div className="flex items-center gap-4">
                              <button type="button" onClick={() => handleInsertVariable(' 😊')} className="hover:text-slate-600" title="Insertar Emoji"><Smile size={16} /></button>
                              <button type="button" onClick={() => handleInsertVariable(' *texto*')} className="hover:text-slate-600 font-bold" title="Negrita"><Bold size={16} /></button>
                              <button type="button" onClick={() => handleInsertVariable(' _texto_')} className="hover:text-slate-600 italic" title="Cursiva"><Italic size={16} /></button>
                              <button type="button" onClick={() => handleInsertVariable(' ~texto~')} className="hover:text-slate-600 flex items-center justify-center h-4 w-4" title="Tachado">
                                <span className="line-through font-bold text-sm select-none leading-none">S</span>
                              </button>
                              <button type="button" onClick={() => handleInsertVariable(' {nombre}')} className="hover:text-slate-600 flex items-center justify-center h-4 w-4" title="Insertar variable">
                                <span className="font-semibold text-sm select-none leading-none">{"{}"}</span>
                              </button>
                              <button type="button" onClick={() => handleInsertVariable(' IA')} className="hover:text-[#5c5dfb] flex items-center justify-center h-4 w-4" title="Asistente IA">
                                <span className="font-extrabold text-[12px] text-[#5c5dfb] tracking-wider select-none leading-none">IA</span>
                              </button>
                              <button type="button" onClick={() => handleInsertVariable(' ✨')} className="hover:text-[#5c5dfb] text-slate-400" title="Generar con IA">
                                <Sparkles size={16} />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-slate-300">
                              {mensaje.length} / {maxLimit}
                            </span>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: SELECCIONAR AUDIENCIA */}
                {currentStep === 2 && (
                  <div className="space-y-4 relative">

                    {/* Top bar: contact count card + Añadir/Limpiar filtro button */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Contact count card */}
                      <div
                        onClick={() => {
                          if (previewCount > 0) {
                            setIsContactsModalOpen(true);
                          }
                        }}
                        className={`flex min-w-[260px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition duration-200 ${
                          previewCount > 0 ? 'cursor-pointer hover:border-sky-100 hover:shadow-md' : 'cursor-default'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#5c5dfb] flex items-center justify-center text-white flex-shrink-0">
                          <Users size={16} />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 leading-none mb-0.5">Envío masivo a:</p>
                          {loadingCount ? (
                            <span className="flex items-center gap-1 text-sm font-bold text-slate-800">
                              <Loader2 size={12} className="animate-spin text-[#5c5dfb]" />
                              ...
                            </span>
                          ) : (
                            <p className="text-sm font-bold text-slate-800 leading-tight">
                              <span className="text-[#5c5dfb]">{previewCount}</span> Contactos
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Añadir/Limpiar filtro button */}
                      <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition shadow-sm"
                          >
                            <Trash2 size={14} />
                            Limpiar filtros
                          </button>
                        )}
                        <button
                          id="add-filter-btn"
                          type="button"
                          onClick={() => setFilterPanelOpen(filterPanelOpen === null ? 'menu' : null)}
                          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#5c5dfb] text-white text-xs font-bold shadow-sm hover:bg-[#4748db] transition"
                        >
                          <Filter size={14} />
                          Añadir filtro
                        </button>
                      </div>
                    </div>

                    {/* Active filters display vs onboarding */}
                    {!hasActiveFilters ? (
                      /* ONBOARDING BOX (Crea tu audiencia segmentada) */
                      <div className="mx-auto mt-16 w-full max-w-[680px] rounded-3xl border border-slate-200 bg-[#f4f6fb] shadow-sm overflow-hidden animate-in fade-in duration-200">
                        <div className="p-6">
                          {/* Title row */}
                          <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                              <Filter size={16} className="text-[#5c5dfb]" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-800 leading-tight">Crea tu audiencia segmentada</h3>
                              <p className="text-[12px] text-slate-400">Agrega filtros para definir quién recibirá tu envío masivo.</p>
                            </div>
                          </div>
                        </div>

                        {/* Filter types explanation cards */}
                        <div className="px-6 pb-2 space-y-3">
                          {/* Tags */}
                          <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-100">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Tag size={13} className="text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-slate-800 mb-1">Filtros por Tags</p>
                                <p className="text-[11px] text-slate-500 mb-2">Selecciona tags y elige cómo aplicarlos:</p>
                                <div className="space-y-1">
                                  <div className="flex items-start gap-1.5">
                                    <CheckCircle2 size={11} className="text-[#5c5dfb] mt-0.5 flex-shrink-0" />
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-slate-700">Contiene algunos:</span> Contactos con al menos uno de los tags seleccionados</p>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <CheckCircle2 size={11} className="text-[#5c5dfb] mt-0.5 flex-shrink-0" />
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-slate-700">Contiene todos:</span> Contactos que tengan todos los tags seleccionados</p>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <CheckCircle2 size={11} className="text-[#5c5dfb] mt-0.5 flex-shrink-0" />
                                    <p className="text-[11px] text-slate-600"><span className="font-bold text-slate-700">Excluir público:</span> Contactos que NO tengan ninguno de los tags seleccionados</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* País */}
                          <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-100">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Globe size={13} className="text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-slate-800 mb-1">Filtro por País</p>
                                <p className="text-[11px] text-slate-500">Seleccione uno o varios países para segmentar tu audiencia por ubicación geográfica.</p>
                              </div>
                            </div>
                          </div>

                          {/* Fecha */}
                          <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-100">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CalendarDays size={13} className="text-slate-500" />
                              </div>
                              <div>
                                <p className="text-[13px] font-bold text-slate-800 mb-1">Filtro por Fecha</p>
                                <p className="text-[11px] text-slate-500">
                                  Filtra contactos según la fecha en que fueron añadidos. Puedes elegir períodos predefinidos o crear un rango personalizado.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* How to start */}
                        <div className="mx-6 mb-6 mt-3 rounded-xl bg-sky-50/60 border border-sky-50 px-4 py-3 flex items-start gap-2">
                          <Filter size={13} className="text-[#5c5dfb] mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-slate-500">
                            <span className="font-bold text-slate-700">¿Cómo empezar?</span> Haz clic en el botón{' '}
                            <span className="inline-flex items-center gap-1 bg-[#5c5dfb] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                              <Filter size={9} /> Añadir filtro
                            </span>{' '}
                            para comenzar a segmentar tu audiencia. Puedes combinar múltiples filtros para crear segmentos más específicos.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ACTIVE FILTERS CONTAINER (Image 3 and 5) */
                      <div className="grid grid-cols-[170px_1fr] gap-6 py-6 px-2 animate-in fade-in duration-200">
                        {/* Left column */}
                        <div className="text-sm font-bold text-slate-700 tracking-tight">
                          Filtros activos
                        </div>
                        
                        {/* Right column with active filter cards */}
                        <div className="w-full max-w-md space-y-6">
                          
                          {/* 1. Country filter block */}
                          {selectedCountries.length > 0 && (
                            <div className="space-y-2 animate-in fade-in duration-150">
                              <h4 className="text-[13px] font-bold text-slate-800">
                                Contactos por país
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedCountries.map((countryCode) => {
                                  const country = COUNTRIES.find(c => c.code === countryCode);
                                  if (!country) return null;
                                  return (
                                    <div
                                      key={countryCode}
                                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm"
                                    >
                                      <span className="text-sm">{country.flag}</span>
                                      <span className="text-xs font-semibold text-slate-700">{country.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedCountries((prev) => prev.filter(code => code !== countryCode))}
                                        className="ml-1 text-slate-400 hover:text-slate-600 font-bold text-sm"
                                      >
                                        x
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 2. Date filter block */}
                          {fechaPeriod && (
                            <div className="space-y-2 animate-in fade-in duration-150">
                              <h4 className="text-[13px] font-bold text-slate-800">
                                Fecha por contactos
                              </h4>
                              <p className="text-[11px] text-slate-400 font-medium">
                                Contactos añadidos entre estas fechas
                              </p>
                              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm">
                                <span className="text-xs font-semibold text-slate-700">
                                  {getDateLabel()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFechaPeriod('');
                                    setCalendarStartDate(null);
                                    setCalendarEndDate(null);
                                  }}
                                  className="ml-1 text-slate-400 hover:text-slate-600 font-bold text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 3. Tags filter block */}
                          {targetType === 'tags' && selectedTags.length > 0 && (
                            <div className="space-y-2 animate-in fade-in duration-150">
                              <h4 className="text-[13px] font-bold text-slate-800">
                                Contactos por tags
                              </h4>
                              <p className="text-[11px] text-slate-400 font-medium">
                                {tagOperation === 'contiene_algunos' ? 'Contiene algunos de los tags seleccionados' :
                                 tagOperation === 'contiene_todos' ? 'Contiene todos los tags seleccionados' :
                                 'Excluye los tags seleccionados'}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedTags.map(tagId => {
                                  const tagObj = tags.find(t => t.id === tagId);
                                  if (!tagObj) return null;
                                  return (
                                    <div
                                      key={tagId}
                                      className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm"
                                    >
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tagObj.color || '#0ea5e9' }} />
                                      <span className="text-xs font-semibold text-slate-700">
                                        {tagObj.nombre}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleTagToggle(tagId)}
                                        className="ml-1 text-slate-400 hover:text-slate-600 font-bold text-sm"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                    {/* RIGHT SIDE FILTER PANEL */}
                    {filterPanelOpen !== null && (
                      <div
                        ref={filterPanelRef}
                        className="absolute top-0 right-0 z-40 flex gap-3 animate-in fade-in slide-in-from-right-2 duration-200"
                      >
                        {/* Sub-panel for Tags */}
                        {filterPanelOpen === 'tags' && (
                          <div className="w-56 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2.5">
                              <span className="text-xs font-bold text-slate-700">Operación</span>
                              <select
                                value={tagOperation}
                                onChange={e => setTagOperation(e.target.value)}
                                className="h-8 rounded-xl border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold outline-none focus:border-[#5c5dfb] text-slate-700 max-w-[125px] truncate"
                              >
                                <option value="contiene_algunos">Contiene algunos</option>
                                <option value="contiene_todos">Contiene todos</option>
                                <option value="excluir">Excluir público</option>
                              </select>
                            </div>

                            <p className="text-xs font-bold text-slate-700">Seleccionar Tags</p>
                            {/* Custom tag multi-select */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                                className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none hover:border-[#5c5dfb] transition"
                              >
                                <span className="truncate">
                                  {selectedTags.length === 0 ? 'Seleccionar Tags' : `${selectedTags.length} seleccionado(s)`}
                                </span>
                                <ChevronDown size={12} className={`text-slate-400 transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
                              {tagDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-40 overflow-y-auto">
                                  <div className="sticky top-0 border-b border-slate-100 bg-white p-2">
                                    <input
                                      type="text"
                                      value={tagSearch}
                                      onChange={e => setTagSearch(e.target.value)}
                                      placeholder="Buscar tag..."
                                      className="h-7 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-[#5c5dfb]"
                                      autoFocus
                                    />
                                  </div>
                                  {filteredTags.length === 0 ? (
                                    <div className="p-3 text-xs text-slate-400 text-center">Sin etiquetas</div>
                                  ) : (
                                    filteredTags.map(tag => {
                                      const sel = selectedTags.includes(tag.id);
                                      return (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          onClick={() => { handleTagToggle(tag.id); setTargetType('tags'); }}
                                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition text-left ${
                                            sel ? 'bg-sky-50 text-[#5c5dfb]' : 'text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#0ea5e9' }} />
                                          <span className="flex-1 truncate">{tag.nombre}</span>
                                          {sel && <Check size={11} />}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Sub-panel for Pais */}
                        {filterPanelOpen === 'pais' && (
                          <div className="w-56 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-700">País</p>
                            <div className="relative">
                              <div
                                onClick={() => setPaisDropdownOpen(!paisDropdownOpen)}
                                className="flex min-h-[36px] py-1.5 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none hover:border-[#5c5dfb] transition cursor-pointer"
                              >
                                <div className="flex flex-wrap gap-1 items-center min-w-0">
                                  {selectedCountries.length > 0 ? (
                                    selectedCountries.map((countryCode) => {
                                      const country = COUNTRIES.find(c => c.code === countryCode);
                                      if (!country) return null;
                                      return (
                                        <span
                                          key={countryCode}
                                          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200"
                                        >
                                          <span>{country.flag}</span>
                                          <span className="max-w-[72px] truncate">{country.name}</span>
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedCountries((prev) => prev.filter(code => code !== countryCode));
                                            }}
                                            className="ml-1 text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
                                          >
                                            x
                                          </span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-slate-400">Selecciona una opción</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {selectedCountries.length > 0 && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCountries([]);
                                      }}
                                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                    >
                                      <X size={12} />
                                    </span>
                                  )}
                                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${paisDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                              {paisDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
                                  <div className="p-2 border-b border-slate-100">
                                    <input
                                      type="text"
                                      value={countrySearch}
                                      onChange={e => setCountrySearch(e.target.value)}
                                      placeholder="Buscar país..."
                                      className="h-7 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none"
                                    />
                                  </div>
                                  <div className="max-h-44 overflow-y-auto">
                                    {filteredCountries.map(c => {
                                      const isSelected = selectedCountries.includes(c.code);
                                      return (
                                        <button
                                          key={c.code}
                                          type="button"
                                          onClick={() => {
                                            setSelectedCountries((prev) =>
                                              prev.includes(c.code)
                                                ? prev.filter(code => code !== c.code)
                                                : [...prev, c.code]
                                            );
                                          }}
                                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition text-left ${
                                            isSelected ? 'bg-sky-50 text-[#5c5dfb]' : 'text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="text-base leading-none">{c.flag}</span>
                                          <span className="flex-1 truncate">{c.name}</span>
                                          {isSelected && <Check size={11} />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sub-panel for Fecha - always shows calendar + period options side by side */}
                        {filterPanelOpen === 'fecha' && (
                          <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-4 flex gap-4">
                            {/* Left: Period options */}
                            <div className="min-w-[130px]">
                              <p className="text-xs font-bold text-slate-700 mb-2">Fecha por contacto</p>
                              <div className="space-y-0.5">
                                {[
                                  { key: 'hoy', label: 'Hoy' },
                                  { key: 'ultimos3', label: 'Últimos 3 días' },
                                  { key: 'ultimos7', label: 'Últimos 7 días' },
                                  { key: 'ultimos14', label: 'Últimos 14 días' },
                                  { key: 'ultimos30', label: 'Último 30 días' },
                                  { key: 'personalizado', label: 'Personalizado' },
                                ].map(opt => (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => {
                                      setFechaPeriod(opt.key);
                                      if (opt.key !== 'personalizado') {
                                        setCalendarStartDate(null);
                                        setCalendarEndDate(null);
                                      }
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                      fechaPeriod === opt.key ? 'bg-sky-50 text-[#5c5dfb]' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Right: Calendar always visible */}
                            <div className="border-l border-slate-100 pl-4">
                              {renderCalendar()}
                            </div>
                          </div>
                        )}

                        {/* Main filter menu panel */}
                        <div className="w-52 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleAddFilter('tags')}
                            className={`flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold transition border-b border-slate-50 ${
                              filterPanelOpen === 'tags' ? 'text-[#5c5dfb] bg-sky-50/50' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Tag size={14} className="text-slate-400" />
                              Tags
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFilter('pais')}
                            className={`flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold transition border-b border-slate-50 ${
                              filterPanelOpen === 'pais' ? 'text-[#5c5dfb] bg-sky-50/50' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Globe size={14} className="text-slate-400" />
                              País
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddFilter('fecha')}
                            className={`flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold transition ${
                              filterPanelOpen === 'fecha' ? 'text-[#5c5dfb] bg-sky-50/50' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CalendarDays size={14} className="text-slate-400" />
                              Fecha por contacto
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* STEP 3: PROGRAMAR ENVIO */}
                {currentStep === 3 && (
                  <div className="space-y-10">
                    <div className="bg-white space-y-8">
                      <h3 className="text-base font-bold text-slate-900">
                        Opciones de envío
                      </h3>

                      {/* Custom checkboxes for envíoTipo */}
                      <div className="flex gap-6">
                        <button
                          type="button"
                          onClick={() => setEnvioTipo('ahora')}
                          className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            envioTipo === 'ahora' ? 'border-[#5c5dfb] bg-[#5c5dfb] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {envioTipo === 'ahora' && <Check size={14} className="stroke-[3]" />}
                          </div>
                          Enviar mensaje ahora
                        </button>

                        <button
                          type="button"
                          onClick={() => setEnvioTipo('programar')}
                          className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer"
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            envioTipo === 'programar' ? 'border-[#5c5dfb] bg-[#5c5dfb] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {envioTipo === 'programar' && <Check size={14} className="stroke-[3]" />}
                          </div>
                          Programar envío masivo
                        </button>
                      </div>

                      {/* Date picker dropdown field */}
                      {envioTipo === 'programar' && (
                        <div className="space-y-2 max-w-md animate-in fade-in duration-200">
                          <label className="block text-sm font-bold text-[#5c5dfb]">
                            Programar
                          </label>
                          <div className="relative" ref={schedulePickerRef}>
                            <button
                              type="button"
                              onClick={() => setSchedulePickerOpen(!schedulePickerOpen)}
                              className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none hover:border-[#5c5dfb] transition"
                            >
                              <span className="flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400" />
                                {formatScheduledDateTime()}
                              </span>
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${schedulePickerOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* UTC Sublabel */}
                            <span className="text-[10px] text-sky-500 font-bold mt-1 block px-1">
                              UTC (UTC)
                            </span>

                            {/* Dropdown Calendar + Time scroll columns */}
                            {schedulePickerOpen && (
                              <div className="absolute left-0 top-full mt-2 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.12)] z-50 p-4 flex gap-4 animate-in fade-in duration-150">
                                {/* Left calendar */}
                                <div className="pr-4 border-r border-slate-100">
                                  {renderScheduleCalendar()}
                                </div>
                                {/* Right Hours/Minutes lists */}
                                <div className="flex flex-col h-48 justify-between min-w-[90px]">
                                  <div className="flex gap-2 h-full">
                                    {/* Hours */}
                                    <div className="w-10 h-full overflow-y-auto px-1 flex flex-col items-center gap-1 border-r border-slate-100 pr-2 scrollbar-thin">
                                      {Array.from({ length: 24 }).map((_, h) => {
                                        const hStr = String(h).padStart(2, '0');
                                        const selected = hStr === (horaEnvio || '12:00').split(':')[0];
                                        return (
                                          <button
                                            key={h}
                                            type="button"
                                            onClick={() => {
                                              const m = (horaEnvio || '12:00').split(':')[1] || '00';
                                              setHoraEnvio(`${hStr}:${m}`);
                                            }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition flex-shrink-0 ${
                                              selected ? 'bg-[#5c5dfb] text-white' : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                          >
                                            {hStr}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {/* Minutes */}
                                    <div className="w-10 h-full overflow-y-auto px-1 flex flex-col items-center gap-1 scrollbar-thin">
                                      {Array.from({ length: 60 }).map((_, m) => {
                                        const mStr = String(m).padStart(2, '0');
                                        const selected = mStr === (horaEnvio || '12:00').split(':')[1];
                                        return (
                                          <button
                                            key={m}
                                            type="button"
                                            onClick={() => {
                                              const h = (horaEnvio || '12:00').split(':')[0] || '12';
                                              setHoraEnvio(`${h}:${mStr}`);
                                            }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition flex-shrink-0 ${
                                              selected ? 'bg-[#5c5dfb] text-white' : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                          >
                                            {mStr}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Velocidad de envio slider */}
                      <div className="space-y-3">
                        <label className="block text-base font-bold text-slate-900">
                          Velocidad de envio
                        </label>
                        
                        <div className="flex items-center gap-4 py-6 max-w-md">
                          {/* Rabbit/Fast icon SVG */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                            <path d="M13 10V4a2 2 0 0 1 4 0v6" />
                            <path d="M17 10V2a2 2 0 0 1 4 0v8" />
                            <path d="M10 14h.01" />
                            <path d="M16 14h.01" />
                            <path d="M6 14c0-2.2 1.8-4 4-4h6a4 4 0 0 1 4 4v2H6v-2Z" />
                            <path d="M8 20h8c1.1 0 2-.9 2-2H6c0 1.1.9 2 2 2Z" />
                          </svg>

                          {/* Slider Track container */}
                          <div className="flex-1 relative flex items-center h-5">
                            {/* Track line */}
                            <div className="absolute left-0 right-0 h-1 bg-slate-200 rounded-full" />
                            
                            {/* Snap dots */}
                            <div className="absolute left-0 right-0 flex justify-between px-0.5">
                              {['rapido', 'normal', 'lento'].map((speed, i) => (
                                <button
                                  key={speed}
                                  type="button"
                                  onClick={() => setVelocidadEnvio(speed)}
                                  className={`w-3 h-3 rounded-full border-2 border-white transition-colors duration-200 ${
                                    velocidadEnvio === speed ? 'bg-[#5c5dfb]' : 'bg-slate-300'
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Active Tooltip and Thumb */}
                            <div
                              className="absolute transition-all duration-200"
                              style={{
                                left: velocidadEnvio === 'rapido' ? '0%' : velocidadEnvio === 'normal' ? '50%' : '100%',
                                transform: 'translateX(-50%)'
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-md select-none pointer-events-none transition-opacity duration-200 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[4px] after:border-transparent after:border-t-slate-900">
                                {velocidadEnvio === 'rapido' ? 'En 5 segundos' : velocidadEnvio === 'normal' ? 'En 15 segundos' : 'En 30 segundos'}
                              </div>

                              {/* Thumb */}
                              <div className="w-5 h-5 rounded-full bg-[#5c5dfb] border-2 border-white shadow-md cursor-pointer" />
                            </div>
                          </div>

                          {/* Turtle/Slow icon SVG */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                            <path d="M12 10a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z" />
                            <path d="M12 4v4" />
                            <path d="M18 6l-2 2" />
                            <path d="M6 6l2 2" />
                            <path d="M4 16h-2" />
                            <path d="M22 16h-2" />
                            <path d="M6 20c0-1.1-.9-2-2-2" />
                            <path d="M18 20c0-1.1.9-2 2-2" />
                          </svg>
                        </div>

                        {/* Labels below */}
                        <div className="flex justify-between max-w-md text-[11px] font-bold text-slate-400 select-none px-4">
                          <span onClick={() => setVelocidadEnvio('rapido')} className={`cursor-pointer transition ${velocidadEnvio === 'rapido' ? 'text-[#5c5dfb]' : 'hover:text-slate-600'}`}>Rápido</span>
                          <span onClick={() => setVelocidadEnvio('normal')} className={`cursor-pointer transition ${velocidadEnvio === 'normal' ? 'text-[#5c5dfb]' : 'hover:text-slate-600'}`}>Medio</span>
                          <span onClick={() => setVelocidadEnvio('lento')} className={`cursor-pointer transition ${velocidadEnvio === 'lento' ? 'text-[#5c5dfb]' : 'hover:text-slate-600'}`}>Lento</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Wizard Navigation Footer */}
              <div className="flex items-center gap-3 justify-end pt-8 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep > 1) {
                      setCurrentStep(currentStep - 1);
                    } else {
                      navigate('/envios-masivos');
                    }
                  }}
                  className="h-11 px-7 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50 bg-white"
                >
                  Volver
                </button>
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    disabled={!stepValid}
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5c5dfb] px-7 text-sm font-bold text-white transition hover:bg-[#4748db] disabled:opacity-50 disabled:hover:bg-[#5c5dfb]"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving || !stepValid}
                    onClick={handleCreateCampaign}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5c5dfb] px-7 text-sm font-bold text-white transition hover:bg-[#4748db] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Crear envío masivo'
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* Right Hand Live Phone Mockup Preview */}
            {currentStep === 1 && (
            <div className="hidden lg:block">
              <div className="sticky top-6 rounded-[3rem] border-[12px] border-slate-900 bg-slate-950 p-0 shadow-xl w-[320px] mx-auto min-h-[560px] flex flex-col overflow-hidden select-none">
                
                {/* Notch */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 h-4 w-32 rounded-b-2xl bg-slate-900 flex items-center justify-center z-50">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                </div>

                {/* Status Bar */}
                <div className="flex justify-between items-center px-6 pt-5 pb-1 text-[9px] text-white bg-[#075e54] font-semibold z-40">
                  <span>1:47</span>
                  <div className="flex items-center gap-1 scale-95">
                    <span>📶</span>
                    <span>📶</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* WhatsApp Header Mock */}
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between border-b border-[#05443c] z-40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold">WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/90 text-xs font-semibold">
                    <span>📷</span>
                    <span>🔍</span>
                    <span>⋮</span>
                  </div>
                </div>

                {/* Chat Bubble Container */}
                <div 
                  className="flex-1 p-3 overflow-y-auto max-h-[380px] space-y-3 flex flex-col justify-end"
                  style={{
                    backgroundColor: '#efeae2',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M10 15a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm25 35a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM70 20a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-15 60a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm35-20a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM20 80c0-5 5-5 5-10s-5-5-5-10' fill='%23e4e0d9' fill-opacity='0.6' fill-rule='evenodd' stroke='%23e4e0d9' stroke-width='0.5' stroke-opacity='0.6'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat'
                  }}
                >
                  
                  {/* Bubble */}
                  {(urlMedia || mensaje) && (
                    <div className="bg-[#d9fdd3] rounded-xl rounded-tr-none p-2 shadow-sm max-w-[85%] self-end text-xs leading-relaxed text-slate-800 relative space-y-1 animate-in fade-in duration-200 border border-[#c2f2b9]">
                      
                      {/* Media render */}
                      {urlMedia && (
                        <div className="rounded-lg overflow-hidden border border-slate-100 bg-white max-h-[140px] flex items-center justify-center">
                          {mediaType === 'video' ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 text-white text-[10px] font-bold">
                              <span className="absolute">▶ Video</span>
                              <video src={urlMedia} className="w-full opacity-60" />
                            </div>
                          ) : (
                            <img src={urlMedia} alt="Preview" className="w-full object-cover" />
                          )}
                        </div>
                      )}

                      {mensaje && (
                        <p
                          className="whitespace-pre-wrap font-sans text-slate-700 text-[11px]"
                          dangerouslySetInnerHTML={{ __html: formattedPreviewText }}
                        />
                      )}
                      
                      <span className="block text-[8px] text-slate-400 text-right mt-1 font-medium">
                        12:00
                      </span>
                    </div>
                  )}

                </div>

                {/* Input mock bar */}
                <div className="p-2.5 bg-[#efeae2] flex items-center gap-1.5 select-none border-t border-slate-200/20">
                  <div className="flex-1 bg-white h-9 rounded-full px-3.5 flex items-center justify-between border border-slate-200/50 shadow-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[15px] leading-none">☺</span>
                      <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">Escribe un mensaje...</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <span>📎</span>
                      <span>📷</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center text-white text-[11px] shadow-sm flex-shrink-0 cursor-pointer">
                    {mensaje ? '➤' : '🎤'}
                  </div>
                </div>

              </div>
            </div>
            )}

          </div>

        </div>
      </main>
      {/* Hidden File Inputs for Local Upload */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleUploadFile(e, 'image')}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={(e) => handleUploadFile(e, 'video')}
        accept="video/*"
        className="hidden"
      />

      {/* Contacts Preview Modal */}
      {isContactsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Envíos masivos</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  <span className="font-bold text-[#5c5dfb]">{previewCount}</span> contactos recibirán este envío masivo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsContactsModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Scrollable list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {previewContacts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-medium">
                  No hay contactos para mostrar.
                </div>
              ) : (
                previewContacts.map((contact, index) => (
                  <div key={contact.id || index} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200">
                        {contact.foto_perfil ? (
                          <img
                            src={contact.foto_perfil.startsWith('http') ? contact.foto_perfil : `${API_URL}${contact.foto_perfil}`}
                            alt={contact.nombre || 'Contacto'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = ''; // Clear source to show default placeholder
                            }}
                          />
                        ) : (
                          <Users size={16} className="text-slate-400" />
                        )}
                      </div>
                      {/* Name */}
                      <span className="text-sm font-semibold text-slate-700 truncate max-w-[180px]">
                        {contact.nombre && contact.nombre.trim() ? contact.nombre : 'Sin nombre'}
                      </span>
                    </div>
                    
                    {/* Phone number */}
                    <span className="text-sm font-semibold text-slate-500 font-mono">
                      {contact.telefono || 'Sin número'}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CrearEnvioMasivo;

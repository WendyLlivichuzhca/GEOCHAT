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

const buildAuthHeaders = (user, extraHeaders = {}) => {
  const headers = { ...extraHeaders };
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

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
  const [targetType, setTargetType] = useState('all'); // 'all', 'tags', 'stage'
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [envioTipo, setEnvioTipo] = useState('ahora'); // 'ahora', 'programar'
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [horaEnvio, setHoraEnvio] = useState('12:00');

  // --- NEW Step 2 Filter State ---
  // filterPanelOpen: null | 'menu' | 'tags' | 'pais' | 'fecha'
  const [filterPanelOpen, setFilterPanelOpen] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]); // Array of filter objects
  // Tags filter sub-state
  const [tagOperation, setTagOperation] = useState('contiene_algunos'); // 'contiene_algunos' | 'contiene_todos' | 'excluir'
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  // Pais filter sub-state
  const [paisDropdownOpen, setPaisDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  // Fecha filter sub-state
  const [fechaPeriod, setFechaPeriod] = useState(''); // 'hoy' | 'ultimos3' | 'ultimos7' | 'ultimos14' | 'ultimos30' | 'personalizado'
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarStartDate, setCalendarStartDate] = useState(null);
  const [calendarEndDate, setCalendarEndDate] = useState(null);
  const filterPanelRef = useRef(null);

  // Close filter panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        // Only close if clicking truly outside
        const addFilterBtn = document.getElementById('add-filter-btn');
        if (addFilterBtn && addFilterBtn.contains(e.target)) return;
        setFilterPanelOpen(null);
        setTagDropdownOpen(false);
        setPaisDropdownOpen(false);
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
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isSelected = (d) => {
      if (!d) return false;
      const date = new Date(year, month, d);
      if (calendarStartDate && calendarEndDate) {
        return date >= calendarStartDate && date <= calendarEndDate;
      }
      if (calendarStartDate) return date.getTime() === calendarStartDate.getTime();
      return false;
    };
    const isStart = (d) => {
      if (!d || !calendarStartDate) return false;
      return new Date(year, month, d).getTime() === calendarStartDate.getTime();
    };
    const isEnd = (d) => {
      if (!d || !calendarEndDate) return false;
      return new Date(year, month, d).getTime() === calendarEndDate.getTime();
    };
    const isToday = (d) => {
      if (!d) return false;
      const today = new Date();
      return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    return (
      <div>
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-slate-100"><ChevronLeft size={14} /></button>
          <span className="text-xs font-bold text-slate-700 capitalize">{monthNames[month]} {year}</span>
          <button type="button" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-slate-100"><ChevronRight size={14} /></button>
        </div>
        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map(d => <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>)}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => (
            <button
              key={i}
              type="button"
              disabled={!d}
              onClick={() => {
                if (!d) return;
                const clicked = new Date(year, month, d);
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
              className={`h-7 w-full text-[11px] font-semibold rounded transition ${
                !d ? 'invisible' :
                isStart(d) || isEnd(d) ? 'bg-[#5c5dfb] text-white' :
                isSelected(d) ? 'bg-indigo-100 text-[#5c5dfb]' :
                isToday(d) ? 'border border-[#5c5dfb] text-[#5c5dfb]' :
                'text-slate-700 hover:bg-slate-100'
              }`}
            >{d}</button>
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
    } else if (type === 'pais') {
      setSelectedCountry('');
    } else if (type === 'fecha') {
      setFechaPeriod('');
      setCalendarStartDate(null);
      setCalendarEndDate(null);
    }
    setFilterPanelOpen(type);
  };

  // API Options State
  const [devices, setDevices] = useState([]);
  const [tags, setTags] = useState([]);
  const [stages, setStages] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Custom Dropdown State
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceSelectRef = useRef(null);

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

  // Media Upload Refs and State
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

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
        setMediaType(type);
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

  // Preview Count State
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);

  // Action State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
        } else if (tagsData.success && Array.isArray(tagsData.data)) {
          setTags(tagsData.data);
        }

        const kanbanResp = await fetch(`${API_URL}/api/kanban`, {
          headers: buildAuthHeaders(user)
        });
        const kanbanData = await kanbanResp.json();
        if (kanbanData.success && Array.isArray(kanbanData.columns)) {
          setStages(kanbanData.columns);
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
        return;
      }

      setLoadingCount(true);
      try {
        const payload = {
          dispositivo_id: Number(dispositivoId),
          targets: {
            type: targetType,
            tag_ids: selectedTags,
            etapa_id: selectedStage ? Number(selectedStage) : null
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
        } else {
          setPreviewCount(0);
        }
      } catch (err) {
        console.error('Error fetching preview count:', err);
        setPreviewCount(0);
      } finally {
        setLoadingCount(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchPreviewCount();
    }, 300);

    return () => clearTimeout(timeout);
  }, [dispositivoId, targetType, selectedTags, selectedStage, user]);

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
    if (!mensaje.trim()) {
      setErrorMsg('El cuerpo del mensaje no puede estar vacío.');
      return;
    }
    if (targetType === 'tags' && selectedTags.length === 0) {
      setErrorMsg('Debes seleccionar al menos una etiqueta.');
      return;
    }
    if (targetType === 'stage' && !selectedStage) {
      setErrorMsg('Debes seleccionar una etapa del embudo.');
      return;
    }
    if (envioTipo === 'programar' && (!fechaEnvio || !horaEnvio)) {
      setErrorMsg('Por favor especifica la fecha y hora de programación.');
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
        mensaje,
        url_media: urlMedia.trim() || null,
        programado_para: programadoPara,
        targets: {
          type: targetType,
          tag_ids: selectedTags,
          etapa_id: selectedStage ? Number(selectedStage) : null
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
    let text = mensaje || 'Tu mensaje aparecerá aquí. Escribe algo en el editor...';
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

  const stepValid = useMemo(() => {
    if (currentStep === 1) {
      return nombre.trim() !== '' && dispositivoId !== '' && mensaje.trim() !== '';
    }
    if (currentStep === 2) {
      if (targetType === 'all') return true;
      if (targetType === 'tags') return selectedTags.length > 0;
      if (targetType === 'stage') return selectedStage !== '';
    }
    return true;
  }, [currentStep, nombre, dispositivoId, mensaje, targetType, selectedTags, selectedStage]);

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
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
                currentStep === 1 ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => setCurrentStep(1)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
                  currentStep === 1
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : nombre && dispositivoId && mensaje
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {nombre && dispositivoId && mensaje ? <Check size={16} /> : '01'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Enviar mensaje</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona una plantilla o crea un mensaje nuevo
                </p>
              </div>
              {currentStep === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" />
              )}
            </div>

            {/* Step 2 */}
            <div
              className={`p-5 flex items-center gap-4 relative border-t md:border-t-0 md:border-l border-slate-100 transition cursor-pointer ${
                currentStep === 2 ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => {
                if (nombre && dispositivoId && mensaje) {
                  setCurrentStep(2);
                }
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
                  currentStep === 2
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : targetType === 'tags' && selectedTags.length === 0
                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                    : targetType === 'stage' && !selectedStage
                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-indigo-600 bg-indigo-50 text-indigo-600'
                }`}
              >
                {currentStep > 2 || (currentStep === 2 && stepValid) ? '02' : '02'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Seleccionar audiencia</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona los contactos que recibirán el envío masivo
                </p>
              </div>
              {currentStep === 2 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" />
              )}
            </div>

            {/* Step 3 */}
            <div
              className={`p-5 flex items-center gap-4 relative border-t md:border-t-0 md:border-l border-slate-100 transition cursor-pointer ${
                currentStep === 3 ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => {
                if (nombre && dispositivoId && mensaje && stepValid) {
                  setCurrentStep(3);
                }
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
                  currentStep === 3
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                03
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Programar envío</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona una fecha y hora para el envío
                </p>
              </div>
              {currentStep === 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 flex-1">
            
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
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#8f88ff]"
                        required
                      />
                    </div>

                    {/* Dispositivo dropdown */}
                    <div className="relative" ref={deviceSelectRef}>
                      <button
                        type="button"
                        onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#8f88ff] focus:ring-1 focus:ring-[#8f88ff] transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {dispositivoId ? (
                            <>
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${getDeviceStatusColor(
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
                                    ? 'bg-indigo-50/50 text-[#5c5dfb]'
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
                          <div className="flex border-2 border-dashed border-indigo-200 rounded-2xl h-24 bg-white items-center justify-center gap-3 text-slate-500 text-xs font-bold animate-in fade-in duration-200">
                            <Loader2 size={20} className="animate-spin text-[#5c5dfb]" />
                            <span>Subiendo archivo...</span>
                          </div>
                        ) : !urlMedia ? (
                          <div className="flex border-2 border-dashed border-indigo-200 rounded-2xl overflow-hidden h-24 bg-white">
                            <button
                              type="button"
                              onClick={() => imageInputRef.current.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 hover:bg-indigo-50/20 transition text-xs font-bold text-slate-500"
                            >
                              <ImageIcon size={20} className="text-[#5c5dfb]" />
                              Imagen
                            </button>
                            <div className="w-[1.5px] bg-indigo-100 my-4" />
                            <button
                              type="button"
                              onClick={() => videoInputRef.current.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 hover:bg-indigo-50/20 transition text-xs font-bold text-slate-500"
                            >
                              <VideoIcon size={20} className="text-[#5c5dfb]" />
                              Video
                            </button>
                          </div>
                        ) : (
                          <div className="relative rounded-2xl overflow-hidden border border-slate-100 max-w-[180px] h-28 bg-slate-50 flex items-center justify-center shadow-sm">
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
                              if (e.target.value.length <= 4000) {
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
                              <button type="button" onClick={() => handleInsertVariable(' IA')} className="hover:text-indigo-600 flex items-center justify-center h-4 w-4" title="Asistente IA">
                                <span className="font-extrabold text-[12px] text-[#5c5dfb] tracking-wider select-none leading-none">IA</span>
                              </button>
                            </div>
                            <span className="text-xs font-bold text-slate-300">
                              {mensaje.length} / 4000
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

                    {/* Top bar: contact count card + Añadir filtro button */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Contact count card */}
                      <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-5 py-3.5 shadow-sm min-w-[160px]">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <Users size={16} className="text-[#5c5dfb]" />
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

                      {/* Añadir filtro button */}
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

                    {/* Active filters chips */}
                    {(targetType === 'tags' && selectedTags.length > 0) || selectedCountry || fechaPeriod ? (
                      <div className="flex flex-wrap gap-2">
                        {targetType === 'tags' && selectedTags.length > 0 && (
                          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
                            <Tag size={11} className="text-[#5c5dfb]" />
                            <span className="text-xs font-semibold text-[#5c5dfb]">
                              Tags ({selectedTags.length})
                            </span>
                            <button type="button" onClick={() => { setSelectedTags([]); setTargetType('all'); }} className="ml-1 text-indigo-400 hover:text-indigo-700">
                              <X size={11} />
                            </button>
                          </div>
                        )}
                        {selectedCountry && (
                          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
                            <Globe size={11} className="text-[#5c5dfb]" />
                            <span className="text-xs font-semibold text-[#5c5dfb]">
                              {COUNTRIES.find(c => c.code === selectedCountry)?.flag} {COUNTRIES.find(c => c.code === selectedCountry)?.name}
                            </span>
                            <button type="button" onClick={() => setSelectedCountry('')} className="ml-1 text-indigo-400 hover:text-indigo-700">
                              <X size={11} />
                            </button>
                          </div>
                        )}
                        {fechaPeriod && (
                          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1.5">
                            <CalendarDays size={11} className="text-[#5c5dfb]" />
                            <span className="text-xs font-semibold text-[#5c5dfb]">
                              {fechaPeriod === 'hoy' ? 'Hoy' : fechaPeriod === 'ultimos3' ? 'Últimos 3 días' : fechaPeriod === 'ultimos7' ? 'Últimos 7 días' : fechaPeriod === 'ultimos14' ? 'Últimos 14 días' : fechaPeriod === 'ultimos30' ? 'Último 30 días' : 'Personalizado'}
                            </span>
                            <button type="button" onClick={() => { setFechaPeriod(''); setCalendarStartDate(null); setCalendarEndDate(null); }} className="ml-1 text-indigo-400 hover:text-indigo-700">
                              <X size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Main info panel */}
                    <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                      <div className="p-6">
                        {/* Title row */}
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
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
                        <div className="rounded-2xl border border-slate-100 p-4 hover:border-indigo-100 transition">
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
                        <div className="rounded-2xl border border-slate-100 p-4 hover:border-indigo-100 transition">
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
                        <div className="rounded-2xl border border-slate-100 p-4 hover:border-indigo-100 transition">
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
                      <div className="mx-6 mb-6 mt-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-start gap-2">
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

                    {/* RIGHT SIDE FILTER PANEL */}
                    {filterPanelOpen !== null && (
                      <div
                        ref={filterPanelRef}
                        className="absolute top-0 right-0 z-40 flex gap-3 animate-in fade-in slide-in-from-right-2 duration-200"
                      >
                        {/* Sub-panel for Tags */}
                        {filterPanelOpen === 'tags' && (
                          <div className="w-56 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-700">Operación</p>
                            <select
                              value={tagOperation}
                              onChange={e => setTagOperation(e.target.value)}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-[#5c5dfb] text-slate-700"
                            >
                              <option value="contiene_algunos">Contiene algunos</option>
                              <option value="contiene_todos">Contiene todos</option>
                              <option value="excluir">Excluir público</option>
                            </select>

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
                                  {tags.length === 0 ? (
                                    <div className="p-3 text-xs text-slate-400 text-center">Sin etiquetas</div>
                                  ) : (
                                    tags.map(tag => {
                                      const sel = selectedTags.includes(tag.id);
                                      return (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          onClick={() => { handleTagToggle(tag.id); setTargetType('tags'); }}
                                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition text-left ${
                                            sel ? 'bg-indigo-50 text-[#5c5dfb]' : 'text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#6366f1' }} />
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

                        {/* Sub-panel for País */}
                        {filterPanelOpen === 'pais' && (
                          <div className="w-56 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-700">País</p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setPaisDropdownOpen(!paisDropdownOpen)}
                                className="flex h-9 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none hover:border-[#5c5dfb] transition"
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  {selectedCountry ? (
                                    <><span>{COUNTRIES.find(c=>c.code===selectedCountry)?.flag}</span><span>{COUNTRIES.find(c=>c.code===selectedCountry)?.name}</span></>
                                  ) : 'Selecciona una opción'}
                                </span>
                                <ChevronDown size={12} className={`text-slate-400 transition-transform ${paisDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>
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
                                    {filteredCountries.map(c => (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => { setSelectedCountry(c.code); setPaisDropdownOpen(false); setCountrySearch(''); }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold transition text-left ${
                                          selectedCountry === c.code ? 'bg-indigo-50 text-[#5c5dfb]' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <span className="text-base leading-none">{c.flag}</span>
                                        <span className="flex-1 truncate">{c.name}</span>
                                        {selectedCountry === c.code && <Check size={11} />}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sub-panel for Fecha */}
                        {filterPanelOpen === 'fecha' && (
                          <div className="w-64 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-700">Fecha por contacto</p>
                            {/* Period quick picks */}
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
                                  onClick={() => setFechaPeriod(opt.key)}
                                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    fechaPeriod === opt.key ? 'bg-indigo-50 text-[#5c5dfb]' : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {/* Calendar - shown when Personalizado */}
                            {fechaPeriod === 'personalizado' && (
                              <div className="pt-2 border-t border-slate-100">
                                {renderCalendar()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Main filter menu panel */}
                        <div className="w-52 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleAddFilter('tags')}
                            className={`flex w-full items-center justify-between px-4 py-3.5 text-sm font-semibold transition border-b border-slate-50 ${
                              filterPanelOpen === 'tags' ? 'text-[#5c5dfb] bg-indigo-50/50' : 'text-slate-700 hover:bg-slate-50'
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
                              filterPanelOpen === 'pais' ? 'text-[#5c5dfb] bg-indigo-50/50' : 'text-slate-700 hover:bg-slate-50'
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
                              filterPanelOpen === 'fecha' ? 'text-[#5c5dfb] bg-indigo-50/50' : 'text-slate-700 hover:bg-slate-50'
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
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-[#5c5dfb]" />
                        Planificación de Tiempo
                      </h3>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="envioTipo"
                            value="ahora"
                            checked={envioTipo === 'ahora'}
                            onChange={() => setEnvioTipo('ahora')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          Enviar ahora
                        </label>

                        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="envioTipo"
                            value="programar"
                            checked={envioTipo === 'programar'}
                            onChange={() => setEnvioTipo('programar')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          Programar envío
                        </label>
                      </div>

                      {envioTipo === 'programar' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Fecha
                            </label>
                            <input
                              type="date"
                              value={fechaEnvio}
                              onChange={(e) => setFechaEnvio(e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Hora
                            </label>
                            <input
                              type="time"
                              value={horaEnvio}
                              onChange={(e) => setHoraEnvio(e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                              required
                            />
                          </div>
                        </div>
                      )}
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
                    ) : envioTipo === 'ahora' ? (
                      'Iniciar Envío'
                    ) : (
                      'Programar Envío'
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* Right Hand Live Phone Mockup Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6 rounded-[3rem] border-[12px] border-slate-900 bg-slate-950 p-4 shadow-xl w-[320px] mx-auto min-h-[560px] flex flex-col overflow-hidden select-none">
                
                {/* Notch */}
                <div className="mx-auto h-4 w-32 rounded-full bg-slate-900 mb-4 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                </div>

                {/* WhatsApp Header Mock */}
                <div className="bg-[#075e54] text-white px-3.5 py-3.5 rounded-t-2xl flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[#075e54] font-black text-xs">
                    W
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Wendy Llivichuzhca</p>
                    <p className="text-[9px] text-[#128c7e] font-semibold">En línea</p>
                  </div>
                </div>

                {/* Chat Bubble Container */}
                <div className="flex-1 bg-[#ece5dd] p-3 rounded-b-2xl overflow-y-auto max-h-[380px] space-y-3 flex flex-col justify-end">
                  
                  {/* Bubble */}
                  {(urlMedia || mensaje) && (
                    <div className="bg-[#e2f7cb] rounded-xl rounded-tr-none p-2.5 shadow-sm max-w-[85%] self-end text-xs leading-relaxed text-slate-800 relative space-y-1.5 animate-in fade-in duration-200">
                      
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
                <div className="mt-4 p-2 bg-[#f0f0f0] rounded-xl flex items-center gap-2 text-[10px] text-slate-400">
                  <div className="flex-1 bg-white px-2.5 py-1.5 rounded-full border border-slate-200">
                    Escribe un mensaje...
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#075e54] flex items-center justify-center text-white">
                    ▷
                  </div>
                </div>

              </div>
            </div>

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
    </div>
  );
};

export default CrearEnvioMasivo;

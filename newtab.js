// Local React & Htm
const React = window.React;
const ReactDOM = window.ReactDOM;
// Using htm to avoid Babel runtime compilation which violates CSP
import { html } from './lib/htm.mjs';

// Bind htm to React.createElement
const h = html.bind(React.createElement);

const { useState, useEffect, useRef } = React;

// ==========================================
// CONFIGURATION SECTION
// ==========================================

// --- Helper Components ---
const Icon = ({ name, className }) => h`
    <i className=${`fa-solid fa-${name} ${className || ''}`} aria-hidden="true"></i>
`;

// --- Default Data (Fallback if offline) ---
// Populated from "OPMS Staff Quick Reference Hub 25-26.xlsx - 25-26 Quick Reference Guide.csv"
const DEFAULT_RESOURCES = {
    "Calendars": [
        { name: "District Calendar 25-26", url: "#" },
        { name: "Cycle Day Calendar 25-26", url: "#" },
        { name: "Important Dates 25-26", url: "#" },
        { name: "OPMS Meeting Schedule 25-26", url: "#" },
        { name: "Marking Period Dates 25-26", url: "#" },
        { name: "Freading Calendar", url: "#" }
    ],
    "Committees & Mtgs": [
        { name: "Annual District Committee Mtgs", url: "#" },
        { name: "OPMS Committee Directory", url: "#" },
        { name: "IL Meeting Agenda", url: "#" },
        { name: "BET Meeting Agenda", url: "#" },
        { name: "REPAD Meeting Agenda", url: "#" }
    ],
    "Communication": [
        { name: "OPMS Observer Document", url: "#" },
        { name: "Staff Newsletter (Admin)", url: "#" },
        { name: "OPMS Newsletter Archive", url: "#" },
        { name: "OPMS Meeting Planner", url: "#" },
        { name: "Admin Year At-A-Glance", url: "#" }
    ],
    "Curriculum & Data": [
        { name: "OPCSD Strategic Plan 25-26", url: "#" },
        { name: "OPMS Curriculum Resources 24-25", url: "#" }
    ],
    "Discipline": [
        { name: "Discipline Referral Directions", url: "#" },
        { name: "OPCSD Code of Conduct", url: "#" },
        { name: "Discipline Flow Chart", url: "#" },
        { name: "ISS/OSS Email (Admin Only)", url: "#" }
    ],
    "Duty Assignments": [
        { name: "Arrival Assignments 25-26", url: "#" },
        { name: "Dining Hall Duty", url: "#" },
        { name: "Coverage/Hallway Duty", url: "#" },
        { name: "Study Hall Assignments", url: "#" }
    ],
    "Safety": [
        { name: "Emergency Folder Docs", url: "#" },
        { name: "Safe Snack List", url: "#" },
        { name: "Classroom Safety Guide", url: "#" },
        { name: "Evacuation Routes", url: "#" },
        { name: "Extreme Heat Policy", url: "#" }
    ],
    "Forms": [
        { name: "Activity Permit Form", url: "#" },
        { name: "Field Trip Forms", url: "#" },
        { name: "Central Supplies Order", url: "#" },
        { name: "Fundraising Form", url: "#" }
    ],
    "Tech Resources": [
        { name: "Copy Central Guidelines", url: "#" },
        { name: "GoGuardian Training", url: "#" },
        { name: "Securly Staff Training", url: "#" },
        { name: "PowerSchool Access", url: "#" }
    ]
};

// --- Widgets ---

const StaffHubWidget = ({ resources }) => {
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const displayResources = resources || DEFAULT_RESOURCES;

    return h`
        <div className="flex flex-col h-full p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <${Icon} name="building-columns" />
                </div>
                <h3 className="font-bold text-slate-700">Staff Hub</h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                ${Object.entries(displayResources).map(([category, items]) => h`
                    <div key=${category} className="border border-slate-200 rounded-xl bg-white/50 overflow-hidden">
                        <button
                            onClick=${() => toggleSection(category)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-semibold text-sm text-slate-700 truncate">${category}</span>
                            <${Icon} name="chevron-down" className=${`text-slate-400 text-xs transition-transform duration-300 ${openSection === category ? 'rotate-180' : ''}`} />
                        </button>

                        <div className=${`accordion-content bg-white ${openSection === category ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-2 pt-0 space-y-1">
                                ${items && items.map((item, idx) => h`
                                    <a
                                        key=${idx}
                                        href=${item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block px-3 py-2 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors truncate"
                                    >
                                        ${item.name}
                                    </a>
                                `)}
                            </div>
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const ClockWidget = ({ settings }) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return h`
        <div className="flex flex-col items-center justify-center h-full p-6 text-center touch-none select-none">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-800 tabular-nums">
                ${time.toLocaleTimeString([], { hour12: !settings.use24Hour, hour: '2-digit', minute: '2-digit' })}
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mt-2 font-medium">
                ${time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
        </div>
    `;
};

const GreetingWidget = ({ settings }) => {
    const hours = new Date().getHours();
    let greeting = "Good evening";
    if (hours < 12) greeting = "Good morning";
    else if (hours < 18) greeting = "Good afternoon";
    return h`
        <div className="flex flex-col justify-center h-full p-6">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1 select-none">${greeting}</p>
            <h2 className="text-3xl font-extrabold text-slate-800 truncate" title=${settings.userName}>
                ${settings.userName || 'Educator'}
            </h2>
        </div>
    `;
};

const SearchWidget = () => {
    const [query, setQuery] = useState('');
    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    };
    return h`
        <div className="flex flex-col justify-center h-full p-6">
            <form onSubmit=${handleSearch} className="relative w-full group">
                <${Icon} name="magnifying-glass" className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="search"
                    value=${query}
                    onInput=${(e) => setQuery(e.target.value)}
                    placeholder="Search Google..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-base shadow-sm"
                />
            </form>
        </div>
    `;
};

const ShortcutsWidget = () => {
    const defaultLinks = [
        { id: 1, name: 'Gmail', url: 'https://mail.google.com', icon: 'envelope' },
        { id: 2, name: 'Drive', url: 'https://drive.google.com', icon: 'hard-drive' },
        { id: 3, name: 'Classroom', url: 'https://classroom.google.com', icon: 'chalkboard-user' },
        { id: 4, name: 'Calendar', url: 'https://calendar.google.com', icon: 'calendar' },
    ];
    const [links, setLinks] = useState(() => {
        const saved = localStorage.getItem('userLinks');
        return saved ? JSON.parse(saved) : defaultLinks;
    });

    // Persistence for links (even if UI to edit them is currently missing)
    useEffect(() => { localStorage.setItem('userLinks', JSON.stringify(links)); }, [links]);

    return h`
        <div className="h-full p-5 overflow-y-auto">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 select-none text-sm uppercase tracking-wide">
                <${Icon} name="link" className="text-indigo-500" /> Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-3">
                ${links.map(link => h`
                    <a key=${link.id} href=${link.url} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/60 border border-transparent hover:border-indigo-200 hover:bg-white hover:shadow-md active:scale-95 transition-all group min-h-[80px]">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-lg">
                            <${Icon} name=${link.icon} />
                        </div>
                        <span className="font-medium text-xs text-slate-600 group-hover:text-slate-900">${link.name}</span>
                    </a>
                `)}
            </div>
        </div>
    `;
};

const TodoWidget = () => {
    const [todos, setTodos] = useState(() => {
        const saved = localStorage.getItem('userTodos');
        return saved ? JSON.parse(saved) : [{ id: 1, text: 'Check emails', done: false }];
    });
    const [newTodo, setNewTodo] = useState('');
    useEffect(() => { localStorage.setItem('userTodos', JSON.stringify(todos)); }, [todos]);

    const addTodo = (e) => {
        e.preventDefault();
        if (!newTodo.trim()) return;
        setTodos([...todos, { id: Date.now(), text: newTodo, done: false }]);
        setNewTodo('');
    };
    return h`
        <div className="flex flex-col h-full p-5">
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 select-none text-sm uppercase tracking-wide">
                <${Icon} name="list-check" className="text-emerald-500" /> Tasks
            </h3>
            <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1 custom-scrollbar">
                ${todos.map(todo => h`
                    <div key=${todo.id} className="group flex items-center gap-3 p-3 rounded-xl bg-white/50 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm transition-all">
                        <button onClick=${() => setTodos(todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))} className=${`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${todo.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-400 bg-white'}`}>
                            ${todo.done && h`<${Icon} name="check" className="text-xs" />`}
                        </button>
                        <span className=${`flex-1 text-sm ${todo.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>${todo.text}</span>
                        <button onClick=${() => setTodos(todos.filter(t => t.id !== todo.id))} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><${Icon} name="trash" /></button>
                    </div>
                `)}
            </div>
            <form onSubmit=${addTodo} className="relative mt-auto">
                <input type="text" value=${newTodo} onInput=${(e) => setNewTodo(e.target.value)} placeholder="Add task..." className="w-full pl-4 pr-10 py-3 text-sm rounded-xl bg-white border border-slate-200 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600"><${Icon} name="plus" /></button>
            </form>
        </div>
    `;
};

const SpacerWidget = () => h`
    <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-slate-300/50 rounded-2xl select-none bg-slate-50/50">
        <span className="text-slate-400 font-medium text-sm">Spacer</span>
    </div>
`;

// --- Main App ---

const AVAILABLE_WIDGETS = [
    { type: 'clock', label: 'Clock', span: 'col-span-2' },
    { type: 'greeting', label: 'Greeting', span: 'col-span-1' },
    { type: 'search', label: 'Search Bar', span: 'col-span-2' },
    { type: 'shortcuts', label: 'Shortcuts', span: 'col-span-1' },
    { type: 'todo', label: 'To-Do List', span: 'col-span-1 row-span-2' },
    { type: 'staffhub', label: 'Staff Hub', span: 'col-span-1 row-span-2' },
    { type: 'spacer', label: 'Empty Space', span: 'col-span-1' },
];

const App = () => {
    const [editMode, setEditMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // ADMIN STATE
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [adminPinInput, setAdminPinInput] = useState('');

    // DISTRICT SYNC STATE - REPLACED WITH LOCAL PERSISTENCE
    const [districtData, setDistrictData] = useState(() => {
        // Try to load from local storage first, else use default
        const saved = localStorage.getItem('district_config_local');
        return saved ? JSON.parse(saved) : {
            backgroundImage: '',
            staffResources: DEFAULT_RESOURCES
        };
    });

    // LOCAL SETTINGS
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('appSettings');
        return saved ? JSON.parse(saved) : { userName: 'Educator', use24Hour: false };
    });

    const [activeWidgets, setActiveWidgets] = useState(() => {
        const saved = localStorage.getItem('layout');
        if (saved) return JSON.parse(saved);
        return [
            { id: 'w1', type: 'greeting', span: 'col-span-1', locked: true },
            { id: 'w2', type: 'clock', span: 'col-span-2', locked: true },
            { id: 'w3', type: 'search', span: 'col-span-2', locked: true },
            { id: 'w4', type: 'shortcuts', span: 'col-span-1', locked: false },
            { id: 'w6', type: 'staffhub', span: 'col-span-1 row-span-2', locked: true },
            { id: 'w5', type: 'todo', span: 'col-span-1 row-span-2', locked: false },
        ];
    });

    // --- EFFECTS ---

    useEffect(() => { localStorage.setItem('layout', JSON.stringify(activeWidgets)); }, [activeWidgets]);
    useEffect(() => { localStorage.setItem('appSettings', JSON.stringify(settings)); }, [settings]);

    // Persist district data locally instead of syncing to Firebase
    useEffect(() => {
        localStorage.setItem('district_config_local', JSON.stringify(districtData));
    }, [districtData]);


    // Apply Background Image
    useEffect(() => {
        if (districtData.backgroundImage) {
            document.body.style.backgroundImage = `url('${districtData.backgroundImage}')`;
            // Adjust overlay opacity if there is an image to ensure text pops
            document.getElementById('bg-overlay').style.background = 'rgba(243, 244, 246, 0.5)';
        } else {
            document.body.style.backgroundImage = 'radial-gradient(#e5e7eb 1px, transparent 1px)';
            document.getElementById('bg-overlay').style.background = 'rgba(243, 244, 246, 0.85)';
        }
    }, [districtData.backgroundImage]);


    // --- ACTIONS ---

    const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const removeWidget = (id) => setActiveWidgets(activeWidgets.filter(w => w.id !== id));
    const addWidget = (widgetDef) => {
        setActiveWidgets([...activeWidgets, { ...widgetDef, id: `w-${Date.now()}`, locked: false }]);
        setShowAddModal(false);
    };

    const moveWidget = (index, direction) => {
        const newWidgets = [...activeWidgets];
        if (direction === 'left' && index > 0) {
            [newWidgets[index], newWidgets[index - 1]] = [newWidgets[index - 1], newWidgets[index]];
        } else if (direction === 'right' && index < newWidgets.length - 1) {
            [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
        }
        setActiveWidgets(newWidgets);
    };

    const toggleLock = (id) => {
        if (!isAdminMode) return;
        setActiveWidgets(activeWidgets.map(w => w.id === id ? { ...w, locked: !w.locked } : w));
    };

    const toggleAdminMode = () => {
        if (isAdminMode) {
            setIsAdminMode(false);
            setAdminPinInput('');
        } else {
            // SECURITY WARNING: Hardcoded PIN is visible in source. Do not use for high-security applications.
            if (adminPinInput === '1234') {
                setIsAdminMode(true);
                setAdminPinInput('');
            } else {
                alert("Incorrect PIN");
                setAdminPinInput('');
            }
        }
    };

    // --- ADMIN ACTIONS (LOCAL NOW) ---

    const saveDistrictBackground = (url) => {
        setDistrictData(prev => ({ ...prev, backgroundImage: url }));
        alert("Background saved locally!");
    };

    const saveResourceLinks = (jsonString) => {
        try {
            const parsed = JSON.parse(jsonString);
            setDistrictData(prev => ({ ...prev, staffResources: parsed }));
            alert("Links updated locally!");
        } catch (e) {
            alert("Invalid JSON format. Please check syntax.");
        }
    };

    const renderWidgetContent = (type) => {
        switch(type) {
            case 'clock': return h`<${ClockWidget} settings=${settings} />`;
            case 'greeting': return h`<${GreetingWidget} settings=${settings} />`;
            case 'search': return h`<${SearchWidget} />`;
            case 'shortcuts': return h`<${ShortcutsWidget} />`;
            case 'todo': return h`<${TodoWidget} />`;
            case 'staffhub': return h`<${StaffHubWidget} resources=${districtData.staffResources} />`;
            case 'spacer': return h`<${SpacerWidget} />`;
            default: return h`<div className="p-4">Unknown Widget</div>`;
        }
    };

    // Formatted JSON for display in textarea
    const resourcesJsonString = JSON.stringify(districtData.staffResources, null, 2);
    const [localJsonEdit, setLocalJsonEdit] = useState(resourcesJsonString);

    // Keep local edit in sync if incoming data changes (unless user is typing, tough balance, simple approach for now)
    useEffect(() => {
        if(!isAdminMode) setLocalJsonEdit(JSON.stringify(districtData.staffResources, null, 2));
    }, [districtData.staffResources, isAdminMode]);


    return h`
        <div className="min-h-screen p-4 md:p-8 pb-32 flex flex-col items-center relative">
            ${isAdminMode && h`<div className="fixed top-0 left-0 w-full bg-rose-600 text-white text-center py-1 text-xs font-bold z-50">ADMIN MODE ACTIVE - UNLOCKED</div>`}

            ${/* Main Grid */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 auto-rows-[180px]">
                ${activeWidgets.map((widget, index) => h`
                    <div
                        key=${widget.id}
                        className=${`glass-panel rounded-3xl relative widget-animate transition-all duration-300 ${widget.span} ${editMode ? 'shake ring-4 ring-indigo-400/30 scale-[0.98]' : 'hover:-translate-y-1 hover:shadow-xl'} ${widget.locked ? 'border-l-4 border-l-slate-300' : ''}`}
                    >
                        ${editMode && h`
                            <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center gap-2 backdrop-blur-[2px] rounded-3xl animate-[fadeIn_0.2s]">

                                ${isAdminMode && h`
                                    <button
                                        onClick=${() => toggleLock(widget.id)}
                                        className=${`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${widget.locked ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
                                        title=${widget.locked ? "Unlock Widget" : "Lock Widget"}
                                    >
                                        <${Icon} name=${widget.locked ? "lock" : "lock-open"} />
                                    </button>
                                `}

                                <button onClick=${() => moveWidget(index, 'left')} disabled=${index === 0} className="w-10 h-10 bg-white text-slate-700 rounded-full shadow-md flex items-center justify-center disabled:opacity-50">
                                    <${Icon} name="arrow-left" />
                                </button>

                                ${(!widget.locked || isAdminMode) ? h`
                                    <button
                                        onClick=${() => removeWidget(widget.id)}
                                        className="w-12 h-12 bg-rose-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-rose-600 active:scale-90 transition-all ring-4 ring-rose-200"
                                    >
                                        <${Icon} name="trash" className="text-lg" />
                                    </button>
                                ` : h`
                                    <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full shadow-inner flex items-center justify-center cursor-not-allowed" title="Locked by Admin">
                                        <${Icon} name="lock" />
                                    </div>
                                `}

                                <button onClick=${() => moveWidget(index, 'right')} disabled=${index === activeWidgets.length - 1} className="w-10 h-10 bg-white text-slate-700 rounded-full shadow-md flex items-center justify-center disabled:opacity-50">
                                    <${Icon} name="arrow-right" />
                                </button>
                            </div>
                        `}
                        ${renderWidgetContent(widget.type)}
                    </div>
                `)}
            </div>

            ${/* Bottom Dock */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
                <div className="dock-panel rounded-full p-2 flex items-center gap-2">
                    <button onClick=${() => setShowSettings(true)} className="w-12 h-12 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"><${Icon} name="gear" className="text-lg" /></button>
                    <div className="w-px h-8 bg-slate-200 mx-1"></div>
                    <button onClick=${() => setShowAddModal(true)} className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"><${Icon} name="plus" className="text-xl" /></button>
                    <div className="w-px h-8 bg-slate-200 mx-1"></div>
                    <button onClick=${() => setEditMode(!editMode)} className=${`w-12 h-12 rounded-full flex items-center justify-center transition-all ${editMode ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}><${Icon} name=${editMode ? "check" : "pen"} className="text-lg" /></button>
                </div>
            </div>

            ${/* Settings Modal */}
            ${showSettings && h`
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className=${`bg-white rounded-2xl shadow-2xl w-full ${isAdminMode ? 'max-w-2xl' : 'max-w-sm'} overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]`}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-bold text-slate-800">Settings</h3>
                            <button onClick=${() => setShowSettings(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><${Icon} name="xmark" /></button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto">

                            ${/* Normal User Settings */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                                <input type="text" value=${settings.userName} onInput=${(e) => updateSetting('userName', e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-semibold text-slate-700" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">24-Hour Clock</span>
                                <button onClick=${() => updateSetting('use24Hour', !settings.use24Hour)} className=${`w-12 h-7 rounded-full transition-colors relative ${settings.use24Hour ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className=${`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${settings.use24Hour ? 'left-6' : 'left-1'}`}></div></button>
                            </div>

                            ${/* Admin Access Section */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Access</label>
                                <div className="flex gap-2">
                                    ${isAdminMode ? h`
                                        <button onClick=${toggleAdminMode} className="w-full py-2 bg-rose-100 text-rose-600 rounded-lg font-bold text-sm hover:bg-rose-200">Disable Admin Mode</button>
                                    ` : h`
                                        <input
                                            type="password"
                                            placeholder="Enter PIN (1234)"
                                            value=${adminPinInput}
                                            onInput=${(e) => setAdminPinInput(e.target.value)}
                                            className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                                        />
                                        <button onClick=${toggleAdminMode} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700">Unlock</button>
                                    `}
                                </div>
                            </div>

                            ${/* ADMIN ONLY CONTROLS */}
                            ${isAdminMode && h`
                                <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 -mx-6 -mb-6 mt-4">
                                    <h4 className="font-bold text-indigo-700 mb-4 flex items-center gap-2">
                                        <${Icon} name="sliders" /> Local Configuration
                                    </h4>

                                    ${/* Background Image */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Background Image URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                value=${districtData.backgroundImage}
                                                onInput=${(e) => setDistrictData({...districtData, backgroundImage: e.target.value})}
                                                className="flex-1 p-2 rounded-lg border border-slate-300 text-sm"
                                            />
                                            <button
                                                onClick=${() => saveDistrictBackground(districtData.backgroundImage)}
                                                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>

                                    ${/* Staff Hub Resources JSON Editor */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Staff Hub Links (JSON)</label>
                                        <p className="text-xs text-slate-400 mb-2">Edit the categories and links below. These changes are saved to this browser only.</p>
                                        <textarea
                                            value=${localJsonEdit}
                                            onInput=${(e) => setLocalJsonEdit(e.target.value)}
                                            className="w-full h-64 p-3 rounded-lg border border-slate-300 font-mono text-xs mb-2"
                                        ></textarea>
                                        <button
                                            onClick=${() => saveResourceLinks(localJsonEdit)}
                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md"
                                        >
                                            Update Links
                                        </button>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `}

            ${/* Add Widget Modal */}
            ${showAddModal && h`
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Add Widget</h3>
                            <button onClick=${() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><${Icon} name="xmark" className="text-xl" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto p-1">
                            ${AVAILABLE_WIDGETS.map((w, idx) => h`
                                <button key=${idx} onClick=${() => addWidget(w)} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 active:bg-indigo-100 active:scale-[0.98] text-left transition-all group flex flex-col gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <${Icon} name=${w.type === 'todo' ? 'list-check' : w.type === 'clock' ? 'clock' : w.type === 'search' ? 'magnifying-glass' : w.type === 'shortcuts' ? 'link' : w.type === 'staffhub' ? 'building-columns' : w.type === 'spacer' ? 'expand' : 'user'} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-700 group-hover:text-indigo-900 block">${w.label}</span>
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">${w.span.replace('col-span-', 'Size: ')}</span>
                                    </div>
                                </button>
                            `)}
                        </div>
                    </div>
                </div>
            `}
        </div>
    `;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h`<${App} />`);

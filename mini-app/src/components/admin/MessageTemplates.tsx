import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Plus, X, Check, Edit2, Trash2 } from 'lucide-react'

interface MessageTemplate {
    id: string
    name: string
    text: string
    category: 'greeting' | 'payment' | 'progress' | 'delivery' | 'other'
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
    {
        id: '1',
        name: 'Приветствие',
        text: 'Здравствуйте! Благодарим за обращение. Ваш заказ принят в работу.',
        category: 'greeting',
    },
    {
        id: '2',
        name: 'Запрос оплаты',
        text: 'Цена установлена. Для начала работы необходимо внести предоплату 50%. После оплаты нажмите кнопку "Я оплатил".',
        category: 'payment',
    },
    {
        id: '3',
        name: 'Прогресс 50%',
        text: 'Работа выполнена на 50%. Продолжаем!',
        category: 'progress',
    },
    {
        id: '4',
        name: 'Работа готова',
        text: 'Работа выполнена! Файлы загружены. Пожалуйста, проверьте и подтвердите получение.',
        category: 'delivery',
    },
    {
        id: '5',
        name: 'Напоминание об оплате',
        text: 'Напоминаем о необходимости оплаты заказа. Если возникли вопросы - напишите нам.',
        category: 'payment',
    },
    {
        id: '6',
        name: 'Запрос информации',
        text: 'Для продолжения работы нам необходима дополнительная информация. Пожалуйста, уточните детали.',
        category: 'other',
    },
]

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
    greeting: { label: 'Приветствие', color: 'text-blue-400' },
    payment: { label: 'Оплата', color: 'text-amber-400' },
    progress: { label: 'Прогресс', color: 'text-cyan-400' },
    delivery: { label: 'Доставка', color: 'text-emerald-400' },
    other: { label: 'Другое', color: 'text-zinc-400' },
}

interface MessageTemplatesProps {
    onSelect: (text: string) => void
}

export const MessageTemplates: React.FC<MessageTemplatesProps> = ({ onSelect }) => {
    const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
        const saved = localStorage.getItem('admin_message_templates')
        return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES
    })
    const [isEditing, setIsEditing] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
    const [filterCategory, setFilterCategory] = useState<string>('all')

    const saveTemplates = (newTemplates: MessageTemplate[]) => {
        setTemplates(newTemplates)
        localStorage.setItem('admin_message_templates', JSON.stringify(newTemplates))
    }

    const handleDelete = (id: string) => {
        saveTemplates(templates.filter(t => t.id !== id))
    }

    const handleSave = () => {
        if (!editingTemplate) return

        if (editingTemplate.id) {
            // Update existing
            saveTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t))
        } else {
            // Add new
            saveTemplates([...templates, { ...editingTemplate, id: Date.now().toString() }])
        }
        setEditingTemplate(null)
        setIsEditing(false)
    }

    const filteredTemplates = filterCategory === 'all'
        ? templates
        : templates.filter(t => t.category === filterCategory)

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-zinc-400">Быстрые ответы</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                            isEditing ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        {isEditing ? 'Готово' : 'Изменить'}
                    </button>
                    {isEditing && (
                        <button
                            onClick={() => {
                                setEditingTemplate({
                                    id: '',
                                    name: '',
                                    text: '',
                                    category: 'other',
                                })
                            }}
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
                <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                        filterCategory === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
                    }`}
                >
                    Все
                </button>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setFilterCategory(key)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                            filterCategory === key ? 'bg-zinc-700 text-white' : `${config.color} opacity-60 hover:opacity-100`
                        }`}
                    >
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Templates List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredTemplates.map((template) => {
                    const categoryConfig = CATEGORY_CONFIG[template.category]
                    return (
                        <motion.div
                            key={template.id}
                            layout
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                            onClick={() => !isEditing && onSelect(template.text)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">{template.name}</span>
                                        <span className={`text-[10px] ${categoryConfig.color}`}>
                                            {categoryConfig.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate mt-0.5">{template.text}</p>
                                </div>
                                {isEditing && (
                                    <div className="flex items-center gap-1 ml-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingTemplate(template)
                                            }}
                                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(template.id)
                                            }}
                                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Edit/Add Modal */}
            <AnimatePresence>
                {editingTemplate && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-50"
                            onClick={() => setEditingTemplate(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl z-50 p-4"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">
                                    {editingTemplate.id ? 'Редактировать' : 'Новый шаблон'}
                                </h3>
                                <button
                                    onClick={() => setEditingTemplate(null)}
                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Название</label>
                                    <input
                                        type="text"
                                        value={editingTemplate.name}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                        placeholder="Название шаблона"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Категория</label>
                                    <select
                                        value={editingTemplate.category}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as MessageTemplate['category'] })}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    >
                                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Текст сообщения</label>
                                    <textarea
                                        value={editingTemplate.text}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, text: e.target.value })}
                                        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                        rows={4}
                                        placeholder="Текст шаблона..."
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={!editingTemplate.name || !editingTemplate.text}
                                    className="w-full py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Сохранить
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

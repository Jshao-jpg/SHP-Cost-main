import React, { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import { Plus, Trash2, Upload, RefreshCw, ArrowDown, FileText, ChevronDown, ChevronUp, CheckCircle, Check, Database } from 'lucide-react'

// Reuse ComboBox from main App if possible, or define here
function ComboBox({ value, options, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (opt) => {
        onChange(opt)
        setIsOpen(false)
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                    type="text"
                    className="field-input"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || '输入或选择...'}
                    style={{ flex: 1, paddingRight: '2rem' }}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#64748b'
                    }}
                >
                    <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
            </div>
            {isOpen && options && options.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#1a1a2e',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '0.25rem'
                }}>
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#fff',
                                background: value === opt ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                                borderBottom: idx < options.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(0, 210, 255, 0.15)'}
                            onMouseLeave={(e) => e.target.style.background = value === opt ? 'rgba(0, 210, 255, 0.2)' : 'transparent'}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function WarehouseCalculator() {
    const [routeOptions, setRouteOptions] = useState({})
    const [selectedNodes, setSelectedNodes] = useState([])
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState([])
    const [showLogs, setShowLogs] = useState(false)
    const [fileMessage, setFileMessage] = useState('')
    const [currentFile, setCurrentFile] = useState('Built-in Template')
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchRoutes()
    }, [])

    const fetchRoutes = async () => {
        try {
            const res = await axios.get('/api/wh/routes')
            setRouteOptions(res.data || {})
        } catch (err) {
            console.error("Error fetching WH routes", err)
            setRouteOptions({})
        }
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        try {
            await axios.post('/api/wh/upload', formData)
            setCurrentFile(file.name)
            setFileMessage(`已加载自定义文件: ${file.name}`)
            setTimeout(() => setFileMessage(''), 5000)
            fetchRoutes()
            setSelectedNodes([])
            setResults(null)
        } catch (err) { alert('Error uploading file') }
    }

    const loadBuiltin = async () => {
        try {
            await axios.post('/api/wh/load-builtin')
            setCurrentFile('Built-in Template')
            setFileMessage('已加载内置模板')
            setTimeout(() => setFileMessage(''), 5000)
            fetchRoutes()
            setSelectedNodes([])
            setResults(null)
        } catch (err) { alert('Error loading built-in table') }
    }

    const downloadBuiltin = () => {
        window.open('/api/wh/download-builtin', '_blank')
    }

    const allPossibleLocations = useMemo(() => {
        const locs = new Set()
        Object.values(routeOptions || {}).forEach(opt => {
            if (opt?.locations) opt.locations.forEach(l => locs.add(l))
        })
        return Array.from(locs).sort()
    }, [routeOptions])

    const mapData = useMemo(() => {
        // Collect all unique locations from route options
        const allLocations = new Set()
        const connections = []

        Object.keys(routeOptions || {}).forEach(node => {
            const details = routeOptions[node]?.details?.[0]
            if (details) {
                allLocations.add(details.from)
                allLocations.add(details.to)
                connections.push({
                    node,
                    from: details.from,
                    to: details.to
                })
            }
        })

        // Create boxes with dynamic positioning
        const locationArray = Array.from(allLocations)
        const leftCol = []
        const rightCol = []

        // Distribute locations into two columns
        locationArray.forEach((loc, idx) => {
            if (idx % 2 === 0) {
                leftCol.push(loc)
            } else {
                rightCol.push(loc)
            }
        })

        const boxes = []
        const ySpacing = 100
        const startY = 80

        leftCol.forEach((loc, idx) => {
            boxes.push({
                id: loc,
                label: loc,
                x: 200,
                y: startY + idx * ySpacing
            })
        })

        rightCol.forEach((loc, idx) => {
            boxes.push({
                id: loc,
                label: loc,
                x: 800,
                y: startY + idx * ySpacing
            })
        })

        // Calculate dynamic viewBox height based on content
        const maxY = boxes.length > 0 ? Math.max(...boxes.map(b => b.y)) : 200
        const viewBoxHeight = maxY + 100 // Add padding at bottom

        return { boxes, connections, viewBoxHeight }
    }, [routeOptions])

    const addNode = () => {
        const newNode = {
            id: Date.now(),
            node: '',
            location: '',
            fields: [],
            inputs: {},
            breakdown: null
        }
        setSelectedNodes([...selectedNodes, newNode])
    }

    const removeNode = (id) => {
        setSelectedNodes(selectedNodes.filter(n => n.id !== id))
    }

    const handleNodeChange = async (id, nodeName) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === id)
        newNodes[idx].node = nodeName

        if (nodeName && (!newNodes[idx].location || !routeOptions[nodeName]?.locations.includes(newNodes[idx].location))) {
            newNodes[idx].location = routeOptions[nodeName]?.locations[0] || ''
        }

        if (newNodes[idx].node && newNodes[idx].location) {
            updateFields(id, newNodes[idx].node, newNodes[idx].location, {})
        }
        setSelectedNodes(newNodes)
    }

    const handleLocationChange = async (id, locationStr) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === id)
        newNodes[idx].location = locationStr

        if (locationStr && (!newNodes[idx].node || !routeOptions[newNodes[idx].node]?.locations.includes(locationStr))) {
            const possible = Object.keys(routeOptions).filter(n => routeOptions[n].locations.includes(locationStr))
            if (possible.length > 0) newNodes[idx].node = possible[0]
        }

        if (newNodes[idx].node && locationStr) {
            updateFields(id, newNodes[idx].node, locationStr, {})
        }
        setSelectedNodes(newNodes)
    }

    const updateFields = async (nodeId, node, location, currentInputs) => {
        try {
            const res = await axios.post('/api/wh/fields', { node, location, inputs: currentInputs })
            const newNodes = [...selectedNodes]
            const idx = newNodes.findIndex(n => n.id === nodeId)
            const nodeToUpdate = newNodes[idx]

            nodeToUpdate.fields = res.data
            // Keep existing inputs if field name matches
            const prevInputs = currentInputs || nodeToUpdate.inputs || {}
            nodeToUpdate.inputs = {}
            res.data.forEach(f => {
                nodeToUpdate.inputs[f.name] = prevInputs[f.name] !== undefined ? prevInputs[f.name] : (f.type === 'select' ? (f.options?.[0] || '') : '')
            })
            setSelectedNodes(newNodes)
        } catch (err) { console.error(err) }
    }

    const handleInputChange = (nodeId, fieldName, value) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === nodeId)
        const node = newNodes[idx]

        const prevValue = node.inputs[fieldName]
        node.inputs[fieldName] = value

        // If the field is a differentiator (select type), we may need to refresh other fields
        const fieldDef = node.fields.find(f => f.name === fieldName)
        if (fieldDef && fieldDef.type === 'select' && prevValue !== value) {
            console.log(`[Field Update] Differentiator field "${fieldName}" changed from "${prevValue}" to "${value}"`)
            console.log(`[Field Update] Refreshing available fields based on current selections:`, node.inputs)
            updateFields(nodeId, node.node, node.location, node.inputs)
        } else {
            setSelectedNodes(newNodes)
        }
    }

    const calculate = async () => {
        setLoading(true)
        try {
            const payload = selectedNodes.map(n => ({
                node: n.node,
                location: n.location,
                inputs: n.inputs
            }))
            const res = await axios.post('/api/wh/calculate', payload)
            setResults(res.data)
            setLogs(res.data.logs || [])
            setShowLogs(true)

            const updatedNodes = [...selectedNodes]
            res.data.node_results.forEach((nr, idx) => {
                if (updatedNodes[idx]) updatedNodes[idx].breakdown = nr.breakdown
            })
            setSelectedNodes(updatedNodes)
        } catch (err) { alert("Calculation failed") }
        finally { setLoading(false) }
    }

    return (
        <div className="wh-calculator">

            <div className="controls-bar" style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', justifyContent: 'center' }}>
                <button className="btn-icon glass" onClick={() => fileInputRef.current.click()}>
                    <Upload size={18} /> Load custom modification table
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-icon glass" onClick={loadBuiltin}>
                        <RefreshCw size={18} /> Restore Built-in
                    </button>
                    <button className="btn-icon glass" onClick={downloadBuiltin} title="Download the current active Excel template">
                        <FileText size={18} /> Download Template
                    </button>
                </div>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleFileUpload} />
            </div>

            {fileMessage && (
                <div className="file-message glass">
                    <CheckCircle size={18} />
                    <span>{fileMessage}</span>
                </div>
            )}

            {/* Current file indicator */}
            <div style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#a8a8a8', fontSize: '0.85rem' }}>
                当前使用: <strong style={{ color: '#e0e0e0' }}>{currentFile}</strong>
            </div>

            <div className="map-container glass" style={{ height: '350px', position: 'relative', marginBottom: '30px' }}>
                <svg viewBox={`0 0 1000 ${mapData.viewBoxHeight}`} style={{ width: '100%', height: '100%' }}>
                    <defs>
                        <marker id="arrowhead-wh" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 255, 255, 0.3)" />
                        </marker>
                        <marker id="arrowhead-active-wh" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#7CFC00" />
                        </marker>
                    </defs>

                    {mapData.connections.map((conn, idx) => {
                        const fromBox = mapData.boxes.find(b => b.id === conn.from)
                        const toBox = mapData.boxes.find(b => b.id === conn.to)
                        if (!fromBox || !toBox) return null

                        const isActive = selectedNodes.some(n => n.node === conn.node)
                        const color = isActive ? '#7CFC00' : 'rgba(255, 255, 255, 0.3)'
                        const strokeWidth = isActive ? 4 : 2.5

                        // Calculate line start/end with padding
                        const angle = Math.atan2(toBox.y - fromBox.y, toBox.x - fromBox.x)
                        const startX = fromBox.x + Math.cos(angle) * 60
                        const startY = fromBox.y + Math.sin(angle) * 30
                        const endX = toBox.x - Math.cos(angle) * 70
                        const endY = toBox.y - Math.sin(angle) * 35

                        return (
                            <g key={idx}>
                                <path
                                    d={`M ${startX} ${startY} L ${endX} ${endY}`}
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    fill="none"
                                    markerEnd={isActive ? "url(#arrowhead-active-wh)" : "url(#arrowhead-wh)"}
                                    style={{
                                        transition: '0.3s',
                                        filter: isActive ? 'drop-shadow(0 0 15px rgba(124, 252, 0, 0.6))' : 'none'
                                    }}
                                />
                                <text
                                    x={(startX + endX) / 2}
                                    y={(startY + endY) / 2 - 10}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="16"
                                    fontWeight="900"
                                    fill="#ffffff"
                                    style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}
                                >
                                    {conn.node}
                                </text>
                            </g>
                        )
                    })}

                    {mapData.boxes.map(box => {
                        const isActive = selectedNodes.some(n => {
                            const conn = mapData.connections.find(c => c.node === n.node)
                            return conn && (conn.from === box.id || conn.to === box.id)
                        })
                        return (
                            <g key={box.id}>
                                <rect
                                    x={box.x - 60}
                                    y={box.y - 25}
                                    width="120"
                                    height="50"
                                    rx="6"
                                    fill="rgba(255, 255, 255, 0.1)"
                                    stroke={isActive ? '#7CFC00' : 'rgba(255, 255, 255, 0.3)'}
                                    strokeWidth={isActive ? '3.5' : '2'}
                                    style={{
                                        transition: '0.3s',
                                        filter: isActive ? 'drop-shadow(0 0 12px rgba(124, 252, 0, 0.8))' : 'none'
                                    }}
                                />
                                <text
                                    x={box.x}
                                    y={box.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="16"
                                    fontWeight="900"
                                    fill="#ffffff"
                                    style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}
                                >
                                    {box.label}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>

            <div className="route-flow">
                {selectedNodes.map((node, index) => (
                    <div key={node.id} className="section-container">
                        <div className="section-wrapper">
                            <div className="node-card glass">
                                <span className="node-badge" style={{ background: '#3b82f6' }}>WH Section {index + 1}</span>
                                <button className="remove-btn" onClick={() => removeNode(node.id)} style={{ position: 'absolute', top: 15, right: 15, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    <Trash2 size={18} />
                                </button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="field-group">
                                        <label className="field-label">From → To</label>
                                        <select
                                            className="field-select"
                                            value={node.location || ''}
                                            onChange={(e) => handleLocationChange(node.id, e.target.value)}
                                        >
                                            <option value="">Select Route...</option>
                                            {(node.node && routeOptions[node.node]?.locations ? routeOptions[node.node].locations : allPossibleLocations).map((loc, idx) => (
                                                <option key={idx} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field-group">
                                        <label className="field-label">Node</label>
                                        <select
                                            className="field-select"
                                            value={node.node || ''}
                                            onChange={(e) => handleNodeChange(node.id, e.target.value)}
                                        >
                                            <option value="">Select Node...</option>
                                            {Object.keys(routeOptions || {}).map((n, idx) => (
                                                <option key={idx} value={n}>{n}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {node.fields.length > 0 && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                        {node.fields.map(field => (
                                            <div className="field-group" key={field.name}>
                                                <label className="field-label">{field.display_name}</label>
                                                <ComboBox
                                                    value={node.inputs[field.name] || ''}
                                                    options={field.options || []}
                                                    onChange={(val) => handleInputChange(node.id, field.name, val)}
                                                    placeholder="输入或选择..."
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {node.breakdown && (
                                <div className="section-breakdown glass">
                                    <div className="breakdown-col" style={{ width: '100%' }}>
                                        <div className="breakdown-title" style={{ color: '#3b82f6' }}>Cost Items</div>
                                        <div className="item-list">
                                            {node.breakdown.base.map((it, i) => (
                                                <div key={i} className="merged-item">
                                                    <div className="merged-label">{it.name}</div>
                                                    <div className="merged-values">
                                                        <div className="merged-row" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{it.row1}</div>
                                                        <div className="merged-row" style={{ fontWeight: '600' }}>{it.row2}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <button className="add-node-btn glass" onClick={addNode}>
                    <Plus size={20} /> Add Calculation Section
                </button>

                <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
                    <button className="btn-primary" onClick={calculate} disabled={loading || selectedNodes.length === 0}>
                        {loading ? <RefreshCw className="spin" size={20} /> : <Database size={20} />}
                        {loading ? 'Calculating...' : 'Calculate Total Warehouse Cost'}
                    </button>
                    {results && (
                        <div className="total-result glass" style={{
                            padding: '2rem 4rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: '2px solid var(--primary)',
                            borderRadius: '1.5rem',
                            marginTop: '2rem'
                        }}>
                            <div className="total-label" style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-muted)' }}>TOTAL COST (HKD)</div>
                            <div className="total-value" style={{ fontSize: '3.5rem', fontWeight: '950', letterSpacing: '-0.02em' }}>
                                {results.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showLogs && logs.length > 0 && (
                <div className="logs-panel glass" style={{
                    marginTop: '3rem',
                    borderRadius: '1.5rem',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
                }}>
                    <div className="logs-header" onClick={() => setShowLogs(!showLogs)} style={{
                        padding: '1.25rem 2rem',
                        background: '#1e293b',
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Database size={18} color="#3b82f6" />
                            <span>Detailed Calculation Diagnostic Logs</span>
                        </div>
                        {showLogs ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    {showLogs && (
                        <div className="logs-content" style={{
                            padding: '1.5rem 2rem',
                            background: '#0f172a',
                            color: '#e2e8f0',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            lineHeight: '1.6',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            {logs.map((log, i) => {
                                const isHeader = log.includes('---') || log.includes('===')
                                const isWarning = log.includes('[WARNING]')
                                return (
                                    <div key={i} style={{
                                        color: isHeader ? '#3b82f6' : (isWarning ? '#f59e0b' : '#e2e8f0'),
                                        fontWeight: isHeader ? 'bold' : 'normal',
                                        padding: isHeader ? '0.75rem 0 0.25rem 0' : '0.1rem 0',
                                        borderBottom: isHeader ? '1px solid #334155' : 'none'
                                    }}>
                                        {log}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

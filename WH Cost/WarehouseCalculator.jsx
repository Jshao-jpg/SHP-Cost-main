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
                    onMouseDown={(e) => {
                        e.preventDefault() // Prevent focus loss
                        setIsOpen(!isOpen)
                    }}
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
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '0.25rem'
                }}>
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                handleSelect(opt)
                            }}
                            style={{
                                padding: '0.5rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#1e293b',
                                background: value === opt ? '#f1f5f9' : 'transparent',
                                borderBottom: idx < options.length - 1 ? '1px solid #f1f5f9' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.background = value === opt ? '#f1f5f9' : 'transparent'}
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

    const allPossibleLocations = useMemo(() => {
        const locs = new Set()
        Object.values(routeOptions || {}).forEach(opt => {
            if (opt?.locations) opt.locations.forEach(l => locs.add(l))
        })
        return Array.from(locs).sort()
    }, [routeOptions])

    const mapData = useMemo(() => {
        const boxes = [
            { id: 'Vendor', label: 'Vendor', x: 200, y: 300 },
            { id: 'WADG', label: 'WADG', x: 200, y: 100 },
            { id: 'Humen', label: 'Humen', x: 800, y: 100 },
            { id: 'HK3PL', label: 'HK3PL', x: 800, y: 300 },
        ]

        const connections = []
        Object.keys(routeOptions || {}).forEach(node => {
            const details = routeOptions[node]?.details?.[0]
            if (details) {
                connections.push({
                    node,
                    from: details.from,
                    to: details.to
                })
            }
        })

        return { boxes, connections }
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
            updateFields(id, newNodes[idx].node, newNodes[idx].location)
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
            updateFields(id, newNodes[idx].node, locationStr)
        }
        setSelectedNodes(newNodes)
    }

    const updateFields = async (nodeId, node, location) => {
        try {
            const res = await axios.post('/api/wh/fields', { node, location })
            const newNodes = [...selectedNodes]
            const idx = newNodes.findIndex(n => n.id === nodeId)
            newNodes[idx].fields = res.data
            // Keep existing inputs if field name matches
            const prevInputs = newNodes[idx].inputs || {}
            newNodes[idx].inputs = {}
            res.data.forEach(f => {
                newNodes[idx].inputs[f.name] = prevInputs[f.name] || f.options[0] || ''
            })
            setSelectedNodes(newNodes)
        } catch (err) { console.error(err) }
    }

    const handleInputChange = (nodeId, fieldName, value) => {
        const newNodes = [...selectedNodes]
        const idx = newNodes.findIndex(n => n.id === nodeId)
        newNodes[idx].inputs[fieldName] = value
        setSelectedNodes(newNodes)
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
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Database size={24} color="#3b82f6" />
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Warehouse Cost Calculation</h2>
            </div>

            <div className="map-container glass" style={{ height: '350px', position: 'relative', marginBottom: '30px' }}>
                <svg viewBox="0 0 1000 400" style={{ width: '100%', height: '100%' }}>
                    <defs>
                        <marker id="arrowhead-wh" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                        <marker id="arrowhead-active-wh" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                        </marker>
                    </defs>

                    {mapData.connections.map((conn, idx) => {
                        const fromBox = mapData.boxes.find(b => b.id === conn.from)
                        const toBox = mapData.boxes.find(b => b.id === conn.to)
                        if (!fromBox || !toBox) return null

                        const isActive = selectedNodes.some(n => n.node === conn.node)
                        const color = isActive ? '#3b82f6' : '#cbd5e1'
                        const strokeWidth = isActive ? 3 : 2

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
                                    style={{ transition: '0.3s' }}
                                />
                                <circle cx={(startX + endX) / 2} cy={(startY + endY) / 2} r="18" fill="white" stroke={color} strokeWidth="2" />
                                <text
                                    x={(startX + endX) / 2}
                                    y={(startY + endY) / 2}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="14"
                                    fontWeight="bold"
                                    fill={color}
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
                                    fill="white"
                                    stroke={isActive ? '#3b82f6' : '#475569'}
                                    strokeWidth={isActive ? '3' : '1.5'}
                                    style={{ transition: '0.3s' }}
                                />
                                <text
                                    x={box.x}
                                    y={box.y}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="14"
                                    fontWeight="600"
                                    fill={isActive ? '#1d4ed8' : '#334155'}
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
                                <button className="remove-btn" onClick={() => removeNode(node.id)}>
                                    <Trash2 size={18} />
                                </button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="field-group">
                                        <label className="field-label">From → To</label>
                                        <select className="field-select" value={node.location} onChange={(e) => handleLocationChange(node.id, e.target.value)}>
                                            <option value="">Select Route</option>
                                            {allPossibleLocations.map(loc => (
                                                <option key={loc} value={loc}>{loc}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field-group">
                                        <label className="field-label">Node</label>
                                        <select className="field-select" value={node.node} onChange={(e) => handleNodeChange(node.id, e.target.value)}>
                                            <option value="">Select Node</option>
                                            {Object.keys(routeOptions || {}).map(n => (
                                                <option key={n} value={n}>{n}</option>
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

                {selectedNodes.length > 0 && (
                    <div className="calculation-footer" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2rem',
                        marginTop: '3.5rem',
                        padding: '2rem 0'
                    }}>
                        <button className="calculate-btn-premium" onClick={calculate} disabled={loading} style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: 'white',
                            padding: '1.25rem 5rem',
                            borderRadius: '1.25rem',
                            border: 'none',
                            fontWeight: '900',
                            fontSize: '1.4rem',
                            cursor: 'pointer',
                            transition: 'all 0.4s',
                            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {loading ? <RefreshCw className="spin" /> : <Database size={24} />}
                            {loading ? 'Calculating...' : 'Calculate Total Warehouse Cost'}
                        </button>
                        {results && (
                            <div className="total-result glass" style={{
                                padding: '2rem 4rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: '2px solid #3b82f6'
                            }}>
                                <div className="total-label" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#64748b' }}>TOTAL COST (HKD)</div>
                                <div className="total-value" style={{ fontSize: '3.5rem', fontWeight: '950', color: '#1e40af', letterSpacing: '-0.02em' }}>
                                    ${results.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showLogs && logs.length > 0 && (
                <div className="logs-panel glass" style={{ marginTop: '2rem' }}>
                    <div className="logs-header" onClick={() => setShowLogs(!showLogs)}>
                        <span>Calculation Logs</span>
                        {showLogs ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    {showLogs && (
                        <div className="logs-content">
                            {logs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

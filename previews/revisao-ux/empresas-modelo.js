/* global window, localStorage */
;(() => {
  'use strict'
  const key = 'jaral-empresas-compartilhadas-v1'
  const copy = (value) => JSON.parse(JSON.stringify(value))
  const names = [
    'Aurora Comércio',
    'Horizonte Serviços',
    'Cedro Tecnologia',
    'Norte Saúde',
    'Ponte Engenharia',
    'Solar Arquitetura',
  ]
  const defaultProfile = {
    archivedAt: null,
    due: false,
    date: '2025-11-15',
    contact: 'Financeiro · (41) 90000-0000',
    notes: '',
    regime: 'simples',
    segmento: 'servicos',
    faturamento: 60000,
    funcionarios: 3,
    socios: 2,
    xml: 150,
    emiteNF: true,
    notas: 20,
    filiais: 0,
    filiaisInativas: 0,
    inativa: false,
    usarHoras: false,
    horas: 10,
    servicos: [],
    anomalias: [],
  }
  let state = {
    companies: Array.from({ length: 300 }, (_, i) => ({
      id: `empresa-${i + 1}`,
      name: `${names[i % names.length]} ${String(i + 1).padStart(3, '0')} Ltda.`,
      legalName: `${names[i % names.length]} Ltda. — exemplo ${i + 1}`,
      code: String(i + 1).padStart(4, '0'),
      cnpj: `00.${String(100 + i)}.000/0001-00`,
      email: `financeiro${i + 1}@exemplo.invalid`,
      phone: '(41) 90000-0000',
      taxRegime: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'][i % 3],
      status: i > 9 && i % 15 === 0 ? 'archived' : 'active',
    })),
    profiles: {},
    routines: {},
  }
  const fees = [680, 540, 900, 1200, 470, 850, 1800, 760, 600, 1150]
  const suggestions = [850, 620, 900, 1500, 550, 850, 2200, 700, 680, 1300]
  for (let i = 0; i < 10; i++) {
    state.profiles[`empresa-${i + 1}`] = {
      ...copy(defaultProfile),
      fee: fees[i],
      suggested: suggestions[i],
      due: i % 3 === 0,
      regime: ['simples', 'presumido', 'real', 'mei'][i % 4],
    }
    state.routines[`empresa-${i + 1}`] = {
      department: 'Fiscal',
      screen: 'Simples Nacional',
      startsOn: '2026-11-01',
      routineIds: ['das', 'dctfweb'],
    }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (
      saved &&
      Array.isArray(saved.companies) &&
      saved.profiles &&
      saved.routines
    )
      state = saved
  } catch {
    /* Browser storage is optional in this local demonstration. */
  }
  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* Keep the current in-memory demonstration. */
    }
  }
  const company = (id) => state.companies.find((item) => item.id === id)
  const normalizeDocument = (value) =>
    String(value || '')
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
  const duplicate = (cnpj, ignoredId) => {
    const document = normalizeDocument(cnpj)
    return (
      document &&
      state.companies.find(
        (item) =>
          item.id !== ignoredId && normalizeDocument(item.cnpj) === document,
      )
    )
  }
  const create = (input) => {
    if (!String(input.name || '').trim())
      throw new Error('Informe o nome fantasia da empresa.')
    const found = duplicate(input.cnpj)
    if (found)
      throw new Error(
        `Este CNPJ já pertence a ${found.name}. Selecione a empresa existente.`,
      )
    const item = {
      id: `empresa-local-${Date.now()}`,
      code: '',
      legalName: '',
      cnpj: '',
      email: '',
      phone: '',
      taxRegime: '',
      ...input,
      name: input.name.trim(),
      status: 'active',
    }
    state.companies.unshift(item)
    persist()
    return copy(item)
  }
  window.JaralCompaniesPreview = {
    list: () => copy(state.companies),
    get: (id) => copy(company(id) || null),
    duplicate,
    create,
    update: (id, input) => {
      const item = company(id)
      if (!item) return
      const found = input.cnpj && duplicate(input.cnpj, id)
      if (found) throw new Error(`Este CNPJ já pertence a ${found.name}.`)
      Object.assign(item, input, { id })
      persist()
      return copy(item)
    },
    getProfile: (id) => copy(state.profiles[id] || null),
    profileRows: () =>
      Object.entries(state.profiles)
        .filter(([id]) => company(id))
        .map(([id, profile]) => ({
          ...copy(profile),
          ...copy(company(id)),
          companyId: id,
          company: copy(company(id)),
        })),
    setProfile: (id, profile) => {
      if (!company(id))
        throw new Error('O perfil exige uma empresa cadastrada.')
      state.profiles[id] = {
        ...copy(defaultProfile),
        ...Object.fromEntries(
          [...Object.keys(defaultProfile), 'fee', 'suggested']
            .filter((key) => Object.hasOwn(profile, key))
            .map((key) => [key, copy(profile[key])]),
        ),
      }
      persist()
    },
    profileTemplate: () => ({
      ...copy(defaultProfile),
      fee: '',
      date: '',
      suggested: 620,
    }),
    getRoutines: (id) => copy(state.routines[id] || null),
    setRoutines: (id, settings) => {
      if (!company(id))
        throw new Error('A configuração exige uma empresa cadastrada.')
      const previous = state.routines[id]
      const contexts =
        previous?.contexts ||
        (previous ? { [previous.department]: previous } : {})
      state.routines[id] = {
        ...copy(settings),
        contexts: { ...copy(contexts), [settings.department]: copy(settings) },
      }
      persist()
    },
  }
})()

import { describe, expect, it } from 'vitest'

import {
  flattenProblemErrors,
  formatProblemDetailsMessage,
  formatProblemErrors,
  getErrorPresentation,
  getProblemFieldErrors,
} from './apiErrors'

describe('api error presentation', () => {
  it('achata mensagens em arrays, objetos aninhados e erros gerais', () => {
    const errors = {
      password: [
        'Esta senha é muito curta.',
        'Esta senha é inteiramente numérica.',
      ],
      profile: {
        contact: {
          email: ['Informe um e-mail válido.'],
        },
      },
      nonFieldErrors: ['Não foi possível concluir o cadastro.'],
      tasks: [{ title: ['Informe o título da tarefa.'] }],
    }

    expect(flattenProblemErrors(errors)).toEqual([
      { path: ['password'], message: 'Esta senha é muito curta.' },
      {
        path: ['password'],
        message: 'Esta senha é inteiramente numérica.',
      },
      {
        path: ['profile', 'contact', 'email'],
        message: 'Informe um e-mail válido.',
      },
      {
        path: ['nonFieldErrors'],
        message: 'Não foi possível concluir o cadastro.',
      },
      {
        path: ['tasks', '0', 'title'],
        message: 'Informe o título da tarefa.',
      },
    ])
    expect(formatProblemErrors(errors)).toEqual([
      'Senha: Esta senha é muito curta.',
      'Senha: Esta senha é inteiramente numérica.',
      'Profile · Contact · E-mail: Informe um e-mail válido.',
      'Não foi possível concluir o cadastro.',
      'Tasks · 1 · Title: Informe o título da tarefa.',
    ])
    expect(getProblemFieldErrors(errors)).toMatchObject({
      password: 'Esta senha é muito curta. Esta senha é inteiramente numérica.',
      'profile.contact.email': 'Informe um e-mail válido.',
      nonFieldErrors: 'Não foi possível concluir o cadastro.',
    })
  })

  it('prioriza os erros de campo antes de detail e title', () => {
    expect(
      formatProblemDetailsMessage({
        status: 400,
        title: 'Requisição inválida',
        detail: 'Os dados enviados não são válidos.',
        errors: {
          newPassword: ['A nova senha deve conter pelo menos 8 caracteres.'],
          newPasswordConfirm: ['As senhas não coincidem.'],
        },
      }),
    ).toBe(
      'Nova senha: A nova senha deve conter pelo menos 8 caracteres. · Confirmação da nova senha: As senhas não coincidem.',
    )
  })

  it('usa mensagens orientadas ao status e torna o Request ID disponível para suporte', () => {
    const presentation = getErrorPresentation({
      status: 429,
      requestId: 'request-429',
      problem: {
        type: 'about:blank',
        title: 'Muitas requisições',
        status: 429,
      },
      response: {
        headers: new Headers({ 'Retry-After': '12' }),
      },
    })

    expect(presentation).toMatchObject({
      status: 429,
      requestId: 'request-429',
      supportReference: 'Código de atendimento: request-429',
      retryAfterSeconds: 12,
      message:
        'Muitas tentativas em pouco tempo. Aguarde 12 segundos antes de tentar novamente.',
    })
  })

  it.each([
    [
      401,
      'Autenticação necessária',
      'Sua sessão expirou ou não é válida. Entre novamente para continuar.',
    ],
    [
      403,
      'Acesso negado',
      'Você não tem permissão para realizar esta ação. Verifique seu acesso e tente novamente.',
    ],
    [
      404,
      'Recurso não encontrado',
      'O recurso solicitado não está disponível.',
    ],
    [
      409,
      'Conflito',
      'Não foi possível concluir porque os dados entraram em conflito. Atualize os dados e tente novamente.',
    ],
    [
      412,
      'Pré-condição não atendida',
      'Esta informação foi alterada por outra pessoa. Atualize os dados e tente novamente.',
    ],
    [
      428,
      'Pré-condição obrigatória',
      'Não foi possível concluir porque falta a versão atual do registro. Recarregue os dados e tente novamente.',
    ],
    [501, 'Não implementado', 'Esta funcionalidade ainda não está disponível.'],
  ])('descreve o status %i de forma acionável', (status, title, message) => {
    expect(formatProblemDetailsMessage({ status, title })).toBe(message)
  })

  it('não expõe detail técnico em erros de servidor', () => {
    expect(
      formatProblemDetailsMessage({
        status: 503,
        title: 'DatabaseUnavailableError: db-01.internal',
        detail: 'postgres connection refused at db-01.internal',
      }),
    ).toBe(
      'O serviço está indisponível temporariamente. Tente novamente em instantes.',
    )
  })
})

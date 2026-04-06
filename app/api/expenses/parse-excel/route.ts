// app/api/expenses/parse-excel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

interface ParsedExpense {
  title: string;
  client: string;
  amount: number;
  paymentDate: string;
  status?: string;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ 
        error: 'Apenas arquivos Excel (.xlsx, .xls) são aceitos' 
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // ✅ CORREÇÃO: Ler SEM converter datas automaticamente
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: false,  // NÃO converter datas para JS Date
      raw: true,         // Manter valores brutos (seriais para datas)
    });
    
    let sheetName = workbook.SheetNames[0];
    if (workbook.SheetNames.includes('Report')) {
      sheetName = 'Report';
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // ✅ CORREÇÃO: Leitura DUPLA - raw (seriais) + formatada (strings)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: true,
      blankrows: false,
    }) as any[][];

    const fmtData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
      dateNF: 'dd/mm/yyyy',
    }) as any[][];

    console.log('========================================');
    console.log('📁 Planilha:', sheetName, '| Linhas:', rawData.length);
    // Debug: mostrar primeiras linhas para comparar raw vs formatado
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      console.log(`  RAW[${i}]:`, JSON.stringify(rawData[i]?.slice(0, 18)));
      console.log(`  FMT[${i}]:`, JSON.stringify(fmtData[i]?.slice(0, 18)));
    }
    console.log('========================================');

    // ✅ Passar ambos os dados para o parser
    const expenses = parseExcelData(rawData, fmtData);

    if (expenses.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Não foi possível extrair despesas.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      expenses,
      totalFound: expenses.length,
      fileName: file.name,
      sheetName,
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar',
      details: error.message 
    }, { status: 500 });
  }
}

// =============================================
// ✅ CONVERSÃO DE DATAS - FUNÇÕES NOVAS
// =============================================

/**
 * Converte número serial do Excel para YYYY-MM-DD
 * Excel conta dias desde 30/12/1899 (com bug do Lotus 1-2-3)
 * Epoch Unix (01/01/1970) = serial 25569
 */
function excelSerialToISO(serial: number): string {
  if (!serial || serial < 1 || serial > 200000) return '';
  
  // Converter serial para timestamp UTC
  const utcDays = Math.floor(serial) - 25569;
  const utcMs = utcDays * 86400 * 1000;
  const date = new Date(utcMs);
  
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  
  const result = `${y}-${m}-${d}`;
  console.log(`    📅 Serial ${serial} → ${result}`);
  return result;
}

/**
 * Parse robusto de data: aceita serial do Excel, objeto Date, ou string
 * Resolve o problema de DD/MM/YYYY vs MM/DD/YYYY
 */
function parseDateToISO(rawValue: any, fmtValue: any): string {
  // ── 1. Valor RAW é número serial do Excel ──
  // Datas de 2020-2030 ficam entre ~43831 e ~47848
  if (typeof rawValue === 'number' && rawValue > 30000 && rawValue < 200000) {
    return excelSerialToISO(rawValue);
  }

  // ── 2. Valor RAW é objeto Date do JavaScript ──
  if (rawValue instanceof Date && !isNaN(rawValue.getTime())) {
    const y = rawValue.getUTCFullYear();
    const m = String(rawValue.getUTCMonth() + 1).padStart(2, '0');
    const d = String(rawValue.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ── 3. Trabalhar com string ──
  const str = String(fmtValue || rawValue || '').trim();
  if (!str) return '';

  // 3a. Já está em ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // 3b. Formato com barras: pode ser DD/MM/YYYY ou MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1]);
    const p2 = parseInt(slashMatch[2]);
    const yearRaw = slashMatch[3];
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;

    // Se p1 > 12 → com certeza é DIA (formato DD/MM/YYYY)
    if (p1 > 12) {
      const result = `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      console.log(`    📅 String "${str}" (p1>${12}) → ${result} [DD/MM/YYYY]`);
      return result;
    }
    
    // Se p2 > 12 → com certeza p2 é DIA (formato MM/DD/YYYY americano)
    if (p2 > 12) {
      const result = `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      console.log(`    📅 String "${str}" (p2>${12}) → ${result} [MM/DD/YYYY]`);
      return result;
    }
    
    // ── AMBÍGUO: ambos ≤ 12 ──
    // Estratégia: Se o raw é um número (serial), já tratamos no passo 1.
    // Se chegou aqui como string, comparar raw vs fmt.
    const rawStr = String(rawValue || '').trim();
    
    // Se raw é número (serial que não passou no filtro acima) ou raw === fmt,
    // significa que o dado original é texto → assumir DD/MM/YYYY (brasileiro)
    if (typeof rawValue === 'number' || rawStr === str || !rawStr) {
      const result = `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      console.log(`    📅 String "${str}" (ambíguo, BR) → ${result} [DD/MM/YYYY]`);
      return result;
    }
    
    // Se raw e fmt são diferentes, o XLSX reformatou → provavelmente MM/DD/YYYY
    const result = `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    console.log(`    📅 String "${str}" (ambíguo, reformatado) → ${result} [MM/DD/YYYY]`);
    return result;
  }

  // 3c. Formato com traços: DD-MM-YYYY
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, d, m, y] = dashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3d. Formato com pontos: DD.MM.YYYY
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  console.log(`    ⚠️ Formato de data não reconhecido: "${str}"`);
  return '';
}

// =============================================
// PARSER PRINCIPAL - ✅ ATUALIZADO
// =============================================

function parseExcelData(rawRows: any[][], fmtRows: any[][]): ParsedExpense[] {
  const expenses: ParsedExpense[] = [];
  let currentCategory = 'OUTROS';
  
  let colMap = {
    titulo: 0,
    cliente: 1,
    valor: -1,
    valorPago: -1,
    emissao: -1,
    vencimento: -1,
    pagamento: -1,
    situacao: -1,
  };
  
  // ── Encontrar linha de cabeçalho e mapear colunas ──
  let headerRowIndex = -1;
  
  for (let i = 0; i < Math.min(fmtRows.length, 30); i++) {
    const row = fmtRows[i];
    if (!row) continue;
    
    const rowLower = row.map((c: any) => String(c || '').toLowerCase().trim());
    
    const tituloIdx = rowLower.findIndex((c: string) => c === 'título' || c === 'titulo');
    const clienteIdx = rowLower.findIndex((c: string) => c === 'cliente');
    
    if (tituloIdx >= 0 && clienteIdx >= 0) {
      colMap.titulo = tituloIdx;
      colMap.cliente = clienteIdx;
      headerRowIndex = i;
      
      rowLower.forEach((cell: string, idx: number) => {
        if (cell === 'valor' && colMap.valor === -1) colMap.valor = idx;
        if (cell === 'valor pago') colMap.valorPago = idx;
        if (cell === 'emissão' || cell === 'emissao') colMap.emissao = idx;
        if (cell === 'vencimento') colMap.vencimento = idx;
        if (cell === 'pagamento') colMap.pagamento = idx;
        if (cell === 'situação' || cell === 'situacao') colMap.situacao = idx;
      });
      
      console.log('✅ Cabeçalho encontrado na linha', i);
      console.log('📋 Mapeamento de colunas:', JSON.stringify(colMap));
      
      // Debug: mostrar uma linha de dados para verificar formato das datas
      if (i + 1 < rawRows.length) {
        const nextRaw = rawRows[i + 1];
        const nextFmt = fmtRows[i + 1];
        if (colMap.pagamento >= 0) {
          console.log(`🔍 Exemplo data pagamento - RAW: "${nextRaw?.[colMap.pagamento]}" (tipo: ${typeof nextRaw?.[colMap.pagamento]}) | FMT: "${nextFmt?.[colMap.pagamento]}"`);
        }
        if (colMap.emissao >= 0) {
          console.log(`🔍 Exemplo data emissão - RAW: "${nextRaw?.[colMap.emissao]}" (tipo: ${typeof nextRaw?.[colMap.emissao]}) | FMT: "${nextFmt?.[colMap.emissao]}"`);
        }
      }
      break;
    }
  }
  
  // ── Processar linhas de dados ──
  for (let i = 0; i < fmtRows.length; i++) {
    const fmtRow = fmtRows[i];
    const rawRow = rawRows[i] || fmtRow;
    if (!fmtRow || fmtRow.length === 0) continue;
    
    const cells = fmtRow.map((c: any) => String(c || '').trim());
    const fullLine = cells.join(' ').toUpperCase();
    
    // Detectar categoria
    if (fullLine.includes('COMISSÃO') || fullLine.includes('COMISSAO')) {
      currentCategory = 'COMISSAO';
      continue;
    }
    if (fullLine.includes('MÃO DE OBRA') || fullLine.includes('MAO DE OBRA') || fullLine.includes('STAF')) {
      currentCategory = 'MAO_DE_OBRA';
      continue;
    }
    if (fullLine.includes('MANUTENÇÃO') || fullLine.includes('MANUTENCAO')) {
      currentCategory = 'MANUTENCAO';
      continue;
    }
    
    // Pular linhas não relevantes
    const firstCell = cells[0].toLowerCase();
    if (
      firstCell === 'título' ||
      firstCell === 'titulo' ||
      firstCell.includes('classificação') ||
      firstCell.includes('total') ||
      firstCell.includes('vencido') ||
      firstCell.includes('a vencer') ||
      firstCell === '' ||
      fullLine.includes('DESPESAS >') ||
      fullLine.includes('FUNDO DE') ||
      fullLine.includes('PAGAMENTO:')
    ) {
      continue;
    }
    
    // Verificar código de 5 dígitos na coluna de título
    const codigo = cells[colMap.titulo];
    if (!codigo || !/^\d{5}$/.test(codigo)) {
      continue;
    }
    
    // Extrair cliente
    const cliente = cells[colMap.cliente] || '';
    if (!cliente || cliente.length < 3) continue;
    
        // ── Extrair valor ──
    let valorPago = 0;
    
    // Tentar coluna "Valor Pago" primeiro
    if (colMap.valorPago >= 0 && cells[colMap.valorPago]) {
      valorPago = parseAmount(cells[colMap.valorPago]);
    }
    
    // Se não encontrou, tentar coluna "Valor"
    if (valorPago === 0 && colMap.valor >= 0 && cells[colMap.valor]) {
      valorPago = parseAmount(cells[colMap.valor]);
    }
    
    // Se ainda não encontrou, procurar R$ na linha (ignorando primeiras colunas)
    if (valorPago === 0) {
      for (let j = 2; j < cells.length; j++) {
        const cell = cells[j];
        if (cell.includes('R$') || cell.match(/^\d+[.,]\d{2}$/)) {
          const valor = parseAmount(cell);
          if (valor > 0 && valor < 100000) {
            valorPago = valor;
            break;
          }
        }
      }
    }
    
    if (valorPago === 0) {
      console.log(`⚠️ Linha ${i}: código ${codigo} sem valor válido`);
      continue;
    }
    
    // ── ✅ CORREÇÃO PRINCIPAL: Extrair data usando RAW + FMT ──
    let dataPagamento = '';
    
    // Tentar coluna "Pagamento" primeiro
    if (colMap.pagamento >= 0) {
      const rawVal = rawRow[colMap.pagamento];
      const fmtVal = cells[colMap.pagamento];
      if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
        dataPagamento = parseDateToISO(rawVal, fmtVal);
      }
    }
    
    // Se não encontrou, tentar coluna "Vencimento"
    if (!dataPagamento && colMap.vencimento >= 0) {
      const rawVal = rawRow[colMap.vencimento];
      const fmtVal = cells[colMap.vencimento];
      if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
        dataPagamento = parseDateToISO(rawVal, fmtVal);
      }
    }
    
    // Se não encontrou, tentar coluna "Emissão"
    if (!dataPagamento && colMap.emissao >= 0) {
      const rawVal = rawRow[colMap.emissao];
      const fmtVal = cells[colMap.emissao];
      if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
        dataPagamento = parseDateToISO(rawVal, fmtVal);
      }
    }
    
    // Se ainda não encontrou, procurar qualquer data na linha
    if (!dataPagamento) {
      for (let j = 2; j < rawRow.length; j++) {
        const rawVal = rawRow[j];
        const fmtVal = cells[j] || '';
        
        // Serial do Excel (número entre 30000 e 200000)
        if (typeof rawVal === 'number' && rawVal > 30000 && rawVal < 200000) {
          dataPagamento = parseDateToISO(rawVal, fmtVal);
          if (dataPagamento) break;
        }
        
        // String com formato de data
        if (typeof fmtVal === 'string' && fmtVal.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)) {
          dataPagamento = parseDateToISO(rawVal, fmtVal);
          if (dataPagamento) break;
        }
      }
    }
    
    // Data padrão se não encontrar nenhuma
    if (!dataPagamento) {
      const hoje = new Date();
      dataPagamento = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      console.log(`⚠️ ${codigo}: sem data encontrada, usando hoje: ${dataPagamento}`);
    }
    
    // ✅ Validação final da data
    const testDate = new Date(dataPagamento + 'T12:00:00Z');
    if (isNaN(testDate.getTime()) || testDate.getUTCFullYear() < 2020 || testDate.getUTCFullYear() > 2030) {
      console.log(`❌ ${codigo}: data inválida "${dataPagamento}", usando hoje`);
      const hoje = new Date();
      dataPagamento = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    }
    
    // ── Situação ──
    let situacao = 'Quitado';
    if (colMap.situacao >= 0 && cells[colMap.situacao]) {
      const sit = cells[colMap.situacao].toLowerCase();
      if (sit.includes('pendente') || sit.includes('aberto')) {
        situacao = 'Pendente';
      }
    }
    
    expenses.push({
      title: codigo,
      client: cliente.substring(0, 100),
      amount: valorPago,
      paymentDate: dataPagamento,
      status: situacao,
      category: currentCategory,
    });
    
    console.log(`✓ ${codigo} | ${cliente.substring(0, 25).padEnd(25)} | R$ ${valorPago.toFixed(2).padStart(10)} | ${dataPagamento} | ${currentCategory}`);
  }
  
  // Remover duplicatas (manter primeiro encontrado de cada código)
  const uniqueExpenses = expenses.filter((exp, index, self) =>
    index === self.findIndex(e => e.title === exp.title)
  );
  
  console.log(`\n🏁 Total: ${uniqueExpenses.length} despesas únicas (de ${expenses.length} encontradas)`);
  
  return uniqueExpenses;
}

// =============================================
// PARSE DE VALORES MONETÁRIOS
// =============================================

function parseAmount(value: string): number {
  if (!value) return 0;
  
  // Remover R$ e espaços
  let cleaned = value.replace('R$', '').replace(/\s/g, '').trim();
  
  if (!/\d/.test(cleaned)) return 0;
  
  // Ignorar se for um código (5 dígitos inteiros sem decimal)
  if (/^\d{5}$/.test(cleaned)) return 0;
  
  // Formato BR: 1.234,56 → 1234.56
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  
  if (isNaN(num) || num > 99999) return 0;
  
  return Math.round(num * 100) / 100;
}
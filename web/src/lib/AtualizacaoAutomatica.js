export class AtualizacaoAutomatica {
  constructor(carregar, { intervalo = 10000, permitido = () => true } = {}) {
    this.carregar = carregar;
    this.intervalo = intervalo;
    this.permitido = permitido;
    this.ativo = false;
  }
  iniciar() {
    if (this.ativo) return;
    this.ativo = true;
    this.agendar();
  }
  agendar() {
    if (this.ativo) this.timer = setTimeout(() => this.atualizar(), this.intervalo);
  }
  async atualizar() {
    try {
      if (this.ativo && this.permitido()) await this.carregar();
    } finally {
      this.agendar();
    }
  }
  parar() {
    this.ativo = false;
    clearTimeout(this.timer);
  }
}

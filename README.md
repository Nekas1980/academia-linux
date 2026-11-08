# Academia Linux · Open Learning Lab

Projeto educativo **gratuito, bilingue (português de Portugal / English)** e independente, construído em HTML, CSS e JavaScript sem dependências de compilação, sem chat e sem serviço de backend.

## Primeira versão

- 16 unidades de aprendizagem (UC01–UC16) com objetivos, explicações originais, comandos, questão de revisão e documentação de referência.
- História de GNU/Linux, comparação de seis distribuições e gestores de pacotes.
- Laboratório de terminal **simulado** com comandos permitidos e saídas fictícias. **Não executa comandos locais ou remotos.**
- Quatro vídeos provenientes de canais do YouTube verificados (links de origem; reprodução embebida apenas após clique do visitante).
- Pesquisa por tema, comando ou ferramenta, filtros por nível, acessibilidade básica e interface adaptada a telemóvel.
- Progresso de UC e preferência de idioma guardados em `localStorage` do próprio navegador; sem contas de utilizador, analytics ou cookies analíticos.

### Ficheiros

```text
academia-linux/
├── index.html       # entrada principal e estrutura
├── styles.css       # apresentação responsiva
├── curriculum.js    # conteúdos educativos PT/EN
├── app.js           # navegação, pesquisa, lições e simulação
├── favicon.svg      # ícone original do projeto
├── .nojekyll         # compatibilidade GitHub Pages
└── README.md         # este ficheiro
```

## Executar localmente

Abrir `index.html` no navegador ou, para testar num servidor HTTP simples:

```bash
cd academia-linux
python3 -m http.server 8000
```

Depois aceder a `http://localhost:8000`.

## Publicar gratuitamente no GitHub Pages — repositório independente

1. Em https://github.com/new criar um repositório **público** chamado `academia-linux`, sem carregar ficheiros sensíveis.
2. Num terminal, na pasta deste projeto:

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Criar Academia Linux bilingue — versão inicial"
   git remote add origin https://github.com/Nekas1980/academia-linux.git
   git push -u origin main
   ```

   O exemplo utiliza o utilizador GitHub atual (`Nekas1980`). Se usar outra conta, altere o URL. Crie o repositório vazio; caso já tenha um README remoto, alinhe as branches antes do push.

3. No GitHub, abrir **Settings > Pages > Build and deployment > Deploy from a branch**; escolher `main` e `/(root)` e guardar.
4. Depois de o GitHub confirmar o deployment, aceder ao endereço `https://Nekas1980.github.io/academia-linux/`.
5. Não é necessário domínio próprio; caso seja adquirido, pode ser ligado mais tarde.

Documentação: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Segurança e conteúdo

- A consola é um simulador com uma lista fixa de comandos e saídas fabricadas. Os dados de processos, endereços IP (por exemplo `192.0.2.10`) e logs apresentados são **fictícios** e estão identificados como demonstração.
- As tarefas relacionadas com segurança destinam-se apenas a **ambientes próprios ou com autorização expressa**.
- Vídeos do YouTube não foram descarregados ou redistribuídos. A visualização embebida só é criada após escolha do utilizador; o YouTube pode recolher dados quando é carregado. O site só guarda localmente o idioma e o progresso.
- A academia é independente e não é afiliada à Linux Foundation, Debian, Ubuntu, Fedora, Arch, openSUSE, Kali ou aos canais de vídeo.
- A conclusão de unidades é um indicador local de progresso e não é uma certificação oficial.

## Ideias para fases seguintes

Percursos dedicados a administração Debian/Ubuntu, ambientes Fedora/RHEL, automação Bash, redes e SOC/Blue Team, laboratórios isolados com máquinas virtuais e avaliação prática. Estatísticas de visitas exigirão um serviço adicional e uma revisão da política de privacidade.

---

## English summary

**Academia Linux** is a free, independent, static learning website in European Portuguese and English. Its first version includes 16 short learning units, distribution comparisons, an interactive **simulated** Linux terminal, review questions and links to official documentation and YouTube videos. No shell commands are actually executed, no account is required, and progress is stored only in the browser. Publish from a public repository on GitHub Pages by enabling **Settings > Pages > Deploy from a branch > main > /(root)**.

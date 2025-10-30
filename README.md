# Introducing the World App – Mesa de Sinuca

Computação Gráfica: Projeto modelo com Three.JS

Prof. Fahad Kalil

Cena 3D representando uma mesa de sinuca com taco e bolas. Inclui animação simples do taco e da bola branca simulando o início da partida.

---

## Como usar os assets (GLTF)

- Baixe o modelo do taco e bolas (GLTF): https://skfb.ly/6DqZE
- Extraia os arquivos e coloque em:

```
src/World/assets/models/pool_set/
```

O código espera:

```
src/World/assets/models/pool_set/scene.gltf
```

Se os arquivos não estiverem presentes, o app usa placeholders para que a cena funcione mesmo assim.

## Requisitos atendidos

1. Modelo 3D GLTF do taco e bolas (ou placeholders).
2. Mesa criada com retângulo plano (feltro + bordas).
3. Animação do taco avançando e bola branca rolando até o triângulo.

## Instalação

### Clonar o projeto

    git clone https://github.com/fahadkalil/Introducing_the_World_App.git

### Para executar

- Windows / Linux / MacOS

  No terminal:

  - Acessar a pasta do projeto
          cd Introducing_the_World_App
  - Executar o comando

          python -m http.server -b 127.0.0.1 8000

  - Acessar via navegador: [http://127.0.0.1:8000](http://127.0.0.1:8000)

Opcional: pode usar a extensão Live Server no VS Code e abrir o `index.html`.

### Para atualizar com novas modificações do repositório (na pasta do projeto)

    git pull

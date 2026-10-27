import express from "express";
import cors from "cors";
import abrirConexao from "./db.js";
import "dotenv/config";

const app = express();

app.use(express.json()); // converter para json 
app.use(express.static("./"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

function formatarDataParaBD(dataStr) {
  if (!dataStr) return null; // data falsa 
  if (dataStr.includes("-")) return dataStr;

  const [dia, mes, ano] = dataStr.split("/"); // separa na ordem mariadb
  return `${ano}-${mes}-${dia}`;
}

const conexao = abrirConexao();

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" }); // Quando o acessar o "/" vai mostrar o index.html
});

// GET - Listar todas as tarefas
app.get("/tarefas", async (req, res) => {
  try {
    const sql = "SELECT * FROM tarefas"; // Comando para o mariadb para listar todas as tarefas
    const resp = await conexao.query(sql); // Gera a resposta
    res.json(resp);
  } catch (err) { // Mostra o erro que ocorreu
    console.log(err);
    res.status(500).json({ erro: "Erro ao buscar as tarefas" });
  }
});

// GET - Listar por Periodo
app.get("/tarefas/periodo", async (req, res) => {
  try {
    const sql = "SELECT * FROM tarefas ORDER BY data_tarefa ASC"; // arrumar em ordem cronologica as tarefas
    const resp = await conexao.query(sql);

    res.json(resp);
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro ao buscar as tarefas" });
  }
});

// GET - Listar tarefa por id
app.get("/tarefas/:id", async (req, res) => {
  const id = Number(req.params.id); // Pega o ID da tarefa que foi passado na URL
  try {
    const sql = "SELECT * FROM tarefas WHERE id_tarefa = ?"; // Comando para o mariadb para listar tarefa por ID
    const resp = await conexao.query(sql, [id]);

    if (resp.length === 0) { // Se não encontrar a tarefa, retorna erro 404
      return res.status(404).json({ erro: "Tarefa não encontrada" });
    }
    res.json(resp[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro ao buscar as tarefas" });
  }
});

// POST - Cadastrar tarefa
app.post("/cadastro", async (req, res) => {
  const { nome, descricao, responsavel, data_tarefa, tarefa_concluida } =
    req.body; // Pega os dados da tarefa que foram passados no corpo da requisição

  if ( // Verifica se todos os campos foram preenchidos
    !nome ||
    !descricao ||
    !responsavel ||
    !data_tarefa ||
    tarefa_concluida === undefined
  ) {
    return res
      .status(400)
      .json({ erro: "Todos os campos da tarefa são obrigatórios" }); 
  }

  const dataFormatada = formatarDataParaBD(data_tarefa); // arrumar ordem

  let com;
  try {
    com = await conexao.getConnection();

    const result = await com.query(
      "INSERT INTO tarefas (nome, descricao, responsavel, data_tarefa, tarefa_concluida) VALUES (?, ?, ?, ?, ?)", // Comando para o mariadb para cadastrar tarefa
      [nome, descricao, responsavel, dataFormatada, tarefa_concluida],
    );

    res.status(201).json({
      mensagem: "Tarefa adicionada com sucesso!",
      id_inserido: Number(result.insertId),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro interno no servidor ao cadastrar" });
  } finally {
    if (com) com.release();
  }
});

// PUT - Atualizar tarefa por ID
app.put("/tarefa/:id", async (req, res) => {
  const id = Number(req.params.id); // Pega o ID da tarefa que foi passado na URL
  const { nome, descricao, responsavel, data_tarefa, tarefa_concluida } =
    req.body; // Pega os dados da tarefa que foram passados no corpo da requisição
  const dataFormatada = formatarDataParaBD(data_tarefa);

  const sql =
    "UPDATE tarefas SET nome = ?, descricao = ?, responsavel = ?, data_tarefa = ?, tarefa_concluida = ? WHERE id_tarefa = ?";

  try {
    const resp = await conexao.query(sql, [ // atualização
      nome,
      descricao,
      responsavel,
      dataFormatada,
      tarefa_concluida,
      id,
    ]);
    if (resp.affectedRows > 0) {  // Se a tarefa foi atualizada com sucesso
      res.json({ mensagem: "Tarefa atualizada com sucesso" });
    } else {
      res.status(404).json({ erro: "Tarefa não encontrada" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro interno no servidor ao atualizar" });
  }
});

// DELETE - Deletar tarefa por ID
app.delete("/tarefa/:id", async (req, res) => {
  const id = Number(req.params.id); // Pega o ID da tarefa que foi passado na URL

  try {
    const sql = "DELETE FROM tarefas WHERE id_tarefa = ?"; // Comando para o mariadb para deletar tarefa por ID
    const resp = await conexao.query(sql, [id]);

    if (resp.affectedRows === 0) { // Se não encontrar a tarefa, retorna erro 404
      return res.status(404).json({ erro: "O ID inserido não existe" });
    }

    res.status(200).json({ mensagem: "Tarefa deletada com sucesso!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ erro: "Erro interno no servidor ao deletar" });
  }
});

const PORT = process.env.PORT || 3000; // Define a porta do servidor, caso não seja definida no .env, será 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`); // Mensagem de confirmação que o servidor está rodando
});
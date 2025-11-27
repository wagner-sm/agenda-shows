import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import ShowCard from "./components/ShowCard";
import ImageModal from "./components/ImageModal";
import AdminPage from "./AdminPage";

const API_CONFIG = {
  baseUrl: "",
  spreadsheetId: "1mf56UH_7u8AYOo8jhRnvrbY9ufRorhku9JnrkLdU0zw",
  range: "Página1!A:Z"
};

function getBaseUrl() {
  return API_CONFIG.baseUrl || window.location.origin;
}

function parseDataBR(dataBR) {
  if (!dataBR) return null;
  const [dia, mes, ano] = dataBR.split("/");
  return new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00`);
}

// Componente principal da agenda de shows
function ShowsPage() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalImg, setModalImg] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchShows() {
      try {
        const baseUrl = getBaseUrl();
        const range = encodeURIComponent(API_CONFIG.range);
        const url = `${baseUrl}/.netlify/functions/sheets/${API_CONFIG.spreadsheetId}/read?range=${range}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Erro desconhecido");
        const rows = data.data;
        if (!rows || rows.length === 0) return [];
        const headers = rows[0];
        const shows = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const show = {};
          headers.forEach((header, index) => {
            show[header.toLowerCase().replace(/\s+/g, "_")] = row[index] || "";
          });
          if (show.artista && show.artista.trim()) {
            shows.push(show);
          }
        }
        return shows;
      } catch (err) {
        setError(err.message);
        return [];
      }
    }

    setLoading(true);
    fetchShows().then(shows => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const showsProcessados = shows
        .map(show => {
          if (!show.data_fim || show.data_fim.trim() === "") {
            show.data_fim = show.data_inicio;
          }
          return show;
        })
        .sort((a, b) => {
          const dataA = parseDataBR(a.data_inicio);
          const dataB = parseDataBR(b.data_inicio);

          // Primeiro ordena por data
          if (dataA.getTime() !== dataB.getTime()) {
            return dataA - dataB;
          }
		  
		  // Se as datas forem iguais, ordena por cidade
          const cidadeComparison = (a.cidade || '').localeCompare(b.cidade || '', 'pt-BR', {
            sensitivity: 'base',
            ignorePunctuation: true
          });
          
          if (cidadeComparison !== 0) {
            return cidadeComparison;
          }

          // Se as datas forem iguais, ordena por nome do artista
          return a.artista.localeCompare(b.artista, 'pt-BR', {
            sensitivity: 'base',
            ignorePunctuation: true
          });
        })
        .filter(show => {
          const dataFim = parseDataBR(show.data_fim);
          return dataFim >= hoje;
        });

      setShows(showsProcessados);
      setLoading(false);
      
    });
  }, []);

  useEffect(() => {
    document.body.className = theme === "light" ? "light-theme" : "";
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      const btn = document.getElementById("backToTop");
      if (btn) {
        if (window.pageYOffset > 300) {
          btn.classList.add("show");
        } else {
          btn.classList.remove("show");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <button
        id="toggleTheme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Alternar tema"
      >
        <i className={theme === "dark" ? "fas fa-moon" : "fas fa-sun"}></i>
      </button>
      <h1>Agenda de Shows</h1>
      <div className="shows-list" id="shows">
        {loading && (
          <p style={{ color: "#ffb347", fontSize: "1.2rem", textAlign: "center", width: "100vw" }}>
            Carregando shows...
          </p>
        )}
        {error && (
          <div style={{ color: "#ffb347", fontSize: "1.2rem", textAlign: "center", width: "100vw" }}>
            <p>Erro ao carregar os shows: {error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#ffb347",
                color: "#181818",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                marginTop: "15px",
              }}
            >
              Tentar Novamente
            </button>
          </div>
        )}
        {!loading && !error && shows.length === 0 && (
          <p style={{ color: "#ffb347", fontSize: "1.2rem", textAlign: "center" }}>
            Nenhum show cadastrado no momento.
          </p>
        )}
        {!loading && !error && shows.map(show => (
          <ShowCard key={show.artista + show.data_inicio + show.cidade} show={show} onImageClick={setModalImg} />
        ))}
      </div>
      <ImageModal src={modalImg} onClose={() => setModalImg(null)} />
      <button id="backToTop" title="Voltar ao topo" onClick={handleBackToTop}>
        <i className="fas fa-arrow-up"></i>
      </button>
    </>
  );
}

// Componente principal com roteamento
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ShowsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
import { useState, useEffect } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/health');
        const data = await response.json();
        if (data.status === 'ok') {
          setStatus('Connected to Fabric Identity Network');
        } else {
          setStatus('Error connecting to API');
        }
      } catch (error) {
        setStatus('API not available');
      }
    };

    checkStatus();
  }, []);

  return (
    <div className="container">
      <main>
        <h1>Fabric Identity Management</h1>
        <p>Status: {status}</p>
      </main>
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f5f5f5;
        }
        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        h1 {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
          text-align: center;
        }
        p {
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
} 
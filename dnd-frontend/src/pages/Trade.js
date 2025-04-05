import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Trade = () => {
  const [tradeItems, setTradeItems] = useState([]);

  useEffect(() => {
    const fetchTradeItems = async () => {
      try {
        // API endpoint'inizi backend tarafında tanımlanan URL ile uyumlu hale getirin.
        const response = await api.get('trade_area_items/');
        setTradeItems(response.data);
      } catch (error) {
        console.error('Ticaret ürünleri alınamadı:', error);
      }
    };

    fetchTradeItems();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Trade Area</h2>
      {tradeItems.length > 0 ? (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {tradeItems.map((item) => (
            <li key={item.trade_item_id} style={{ marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              <p><strong>{item.item_name || 'Unnamed Item'}</strong></p>
              <p>Price: {item.price} Gold</p>
              <p>Stock: {item.stock}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No trade items available.</p>
      )}
      <br />
      <Link to="/dashboard">Go Back to Dashboard</Link>
    </div>
  );
};

export default Trade;

import { useEffect, useState } from 'react';
import { getNodes } from '../api';

export function useLiveNodes(intervalMs = 3000) {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getNodes();
        if (active) setNodes(data);
      } catch (err) {
        console.error('Failed to load nodes', err);
      }
    };

    load();
    const id = setInterval(load, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return nodes;
}

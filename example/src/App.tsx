import React from 'react';
import Example1 from './Example1';
import Example2 from './Example2';
import Example3 from './Example3';
import Example4 from './Example4';

const EXAMPLE = 1;

export default function App() {
  switch (EXAMPLE) {
    case 1:
      return <Example1 />;
    case 2:
      return <Example2 />;
    case 3:
      return <Example3 />;
    case 4:
      return <Example4 />;
    default:
  }
}

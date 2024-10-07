import React from 'react';
import Example1 from './Example1';
import Example2 from './Example2';

const EXAMPLE = 1;

export default function App() {
  switch (EXAMPLE) {
    case 1:
      return <Example1 />;
    case 2:
      return <Example2 />;
    default:
  }
}

import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';

// Main App Component - Entry point for Figma Make
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
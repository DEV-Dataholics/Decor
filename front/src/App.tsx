import { RouterProvider } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { router } from './router';

export default function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}

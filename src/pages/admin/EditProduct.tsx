import ProductForm from './ProductForm';
import { useParams } from 'react-router-dom';

interface EditProductProps {
  id?: string;
}

export default function EditProduct({ id: propId }: EditProductProps) {
  const { id: paramId } = useParams<{ id: string }>();
  const productId = propId || paramId;
  
  if (!productId) {
    return <div>Product ID not provided</div>;
  }
  
  return <ProductForm id={productId} />;
}

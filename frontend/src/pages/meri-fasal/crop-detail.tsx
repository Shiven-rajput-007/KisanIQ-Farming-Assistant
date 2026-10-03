import { useParams } from 'react-router-dom';
export default function CropDetail() {
  const { cropId } = useParams();
  return <div className="p-4"><h1 className="text-2xl font-bold">Crop Detail {cropId}</h1></div>;
}

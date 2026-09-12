import "./calculator.css"
import CalculatorApp from "../../components/calculator/CalculatorApp"

export const metadata = {
  title: "Calculadora de costos | ODYSS3D",
  description: "Calcula el costo real de cada impresión 3D de Odyss3D y encuentra el precio ideal de venta.",
}

export default function CalPage() {
  return <CalculatorApp />
}
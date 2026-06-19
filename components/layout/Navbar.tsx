import Link from "next/link"
import { Button } from "../ui/button"

export default function Navbar() {
  return (
    <nav className="w-full h-fit py-4n sticky">
      <ul className="flex flex-row justify-center items-center gap-2">
        <Button><li><Link href={"/"}>Home</Link></li></Button>
        <li><Link href={"/list"}>Lists</Link></li>
        <li><Link href={"/words"}>Words</Link></li>
      </ul>
    </nav>
  )
}



export default function Footer() {

  const date = new Date().getFullYear()

  return (
    <footer className="h-4 w-full flex justify-center items-center">
      ©{date}
    </footer>
  )
}

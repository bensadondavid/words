'use client'

import { toast } from "sonner"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash } from "lucide-react"

type FormList = {
  name: string
  language: string
  translations: string[]
}

const defaultForm: FormList = { name: '', language: '', translations: [''] }

export default function Lists() {

  const [formList, setFormList] = useState<FormList>(defaultForm)
  const [open, setOpen] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormList(prev => ({ ...prev, [name]: value }))
  }

  const addLanguage = () => {
    setFormList(prev => ({
      ...prev,
      translations: [...prev.translations, ''],
    }))
  }

  const deleteLanguage = (indexToDelete: number) => {
    setFormList(prev => ({
      ...prev,
      translations: prev.translations.filter((_, index) => index !== indexToDelete),
    }))
  }

  const handleTranslationChange = (index: number, value: string) => {
    setFormList(prev => ({
      ...prev,
      translations: prev.translations.map((translation, i) =>
        i === index ? value : translation
      ),
    }))
  }

  const addList = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault()
    const response = await fetch('/api/createlist', {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify(formList)
    })
    if (!response.ok) {
      const data = await response.json()
      console.error(data.error)
      return toast.error('Liste non créée, réessayer')
    }
    toast.success('Liste créée')
    setFormList(defaultForm)
  }
  
  const cancel = ()=>{
    setFormList({
      name : '',
      language : '',
      translations : [""]
    })
    setOpen(false)
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="fixed top-5 right-5 rounded-full">Créer une nouvelle liste</Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-scroll">
          <DialogHeader>
            <DialogTitle>Nouvelle liste</DialogTitle>
          </DialogHeader>
          <form onSubmit={addList} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="pb-2">Nom</Label>
              <Input id="name" name="name" value={formList.name} onChange={handleChange} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="language" className="pb-2">Première langue</Label>
              <Input id="language" name="language" value={formList.language} onChange={handleChange} required />
            </div>
            {formList.translations.map((translation, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Label htmlFor={`translation-${index}`} className="pb-2">
                  Langue de traduction {index + 1}
                </Label>
                <div className="flex flex-row justify-between">
                  <Input
                    id={`translation-${index}`}
                    value={translation}
                    onChange={(e) => handleTranslationChange(index, e.target.value)}
                    required
                    className= "w-4/5"
                  />
                  {index >= 1 &&
                  <button type="button" onClick={() => deleteLanguage(index)}>
                    <Trash />
                  </button>
                  }
                </div>
              </div>
            ))}
            <Button type="button" onClick={addLanguage} className="mt-1">
              Ajouter une langue
            </Button>
            <Button type="submit" className="mt-1">Créer</Button>
            <Button type="button" onClick={cancel} className="mt-1">Annuler</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

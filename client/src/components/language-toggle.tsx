import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'ru')}>
        <SelectTrigger className="w-24" data-testid="select-language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en" data-testid="option-english">
            English
          </SelectItem>
          <SelectItem value="ru" data-testid="option-russian">
            Русский
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

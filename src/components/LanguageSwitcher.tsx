import React from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: "en", name: t("languages.en"), flag: "🇺🇸" },
    { code: "ar", name: t("languages.ar"), flag: "🇵🇸" },
    { code: "fr", name: t("languages.fr"), flag: "🇫🇷" },
  ];

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    // Direction/lang are applied by the i18n "languageChanged" listener.
    i18n.changeLanguage(languageCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage.flag} {currentLanguage.name}
          </span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              i18n.language === language.code
                ? "bg-primary/10 text-primary"
                : ""
            }`}
          >
            <span>{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;

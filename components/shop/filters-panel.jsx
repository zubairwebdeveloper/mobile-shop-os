"use client";

import { useDispatch, useSelector } from "react-redux";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { resetFilters, setInStockOnly, setPrice, toggleFilter } from "@/store/slices/filters-slice";
import { CONDITION_FILTERS, MAX_PRICE, RAM_FILTERS, STORAGE_FILTERS } from "@/lib/constants/catalog";
import { formatPrice, formatStorage } from "@/lib/utils/format";
import { getBrands, getCategories } from "@/services/catalog";

function CheckGroup({ title, name, options, selected, onToggle }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-heading text-sm font-bold">{title}</legend>
      <div className="space-y-2.5">
        {options.map((o) => {
          const id = `${name}-${o.value}`;
          return (
            <div key={id} className="flex items-center gap-2.5">
              <Checkbox id={id} checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} />
              <Label htmlFor={id} className="cursor-pointer font-normal">
                {o.label}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FiltersPanel() {
  const dispatch = useDispatch();
  const f = useSelector((state) => state.filters);
  const toggle = (key) => (value) => dispatch(toggleFilter({ key, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Filters</h2>
        <Button variant="ghost" size="sm" onClick={() => dispatch(resetFilters())}>
          Reset all
        </Button>
      </div>

      <CheckGroup
        title="Category"
        name="cat"
        options={getCategories().map((c) => ({ value: c.slug, label: c.name }))}
        selected={f.categories}
        onToggle={toggle("categories")}
      />
      <Separator />
      <CheckGroup
        title="Brand"
        name="brand"
        options={getBrands().map((b) => ({ value: b.slug, label: b.name }))}
        selected={f.brands}
        onToggle={toggle("brands")}
      />
      <Separator />

      <div className="space-y-4">
        <h3 className="font-heading text-sm font-bold">Price range</h3>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={5000}
          value={f.price}
          onValueChange={(v) => dispatch(setPrice(v))}
        />
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>{formatPrice(f.price[0])}</span>
          <span>{formatPrice(f.price[1])}</span>
        </div>
      </div>
      <Separator />

      <CheckGroup
        title="RAM"
        name="ram"
        options={RAM_FILTERS.map((v) => ({ value: v, label: `${v}GB` }))}
        selected={f.rams}
        onToggle={toggle("rams")}
      />
      <Separator />
      <CheckGroup
        title="Storage"
        name="storage"
        options={STORAGE_FILTERS.map((v) => ({ value: v, label: formatStorage(v) }))}
        selected={f.storages}
        onToggle={toggle("storages")}
      />
      <Separator />
      <CheckGroup
        title="Condition"
        name="cond"
        options={CONDITION_FILTERS.map((v) => ({ value: v, label: v }))}
        selected={f.conditions}
        onToggle={toggle("conditions")}
      />
      <Separator />

      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="in-stock" className="cursor-pointer">
          In stock only
        </Label>
        <Switch id="in-stock" checked={f.inStockOnly} onCheckedChange={(v) => dispatch(setInStockOnly(v))} />
      </div>
    </div>
  );
}

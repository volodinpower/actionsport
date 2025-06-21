import Select from "react-select";

export default function FilterBar({
  submenuList = [],
  sizeFilter,
  setSizeFilter,
  brandFilter,
  setBrandFilter,
  genderFilter,
  setGenderFilter,
  genderOptions = [],
  categoryFilter,
  setCategoryFilter,
  clearFilters,
  showGender = true,
  showCategory = false,
  allSizes = [],
  allBrands = [],
}) {
  // Обработка смены бренда — сбрасываем категорию, если бренд сменился
  const handleBrandChange = (opt) => {
    setBrandFilter(opt ? opt.value : "");
    // Если выбрали бренд — сбрасываем выбранную категорию, т.к. доступные могут поменяться
    setCategoryFilter("");
  };

  // Показывать gender если есть больше одного варианта, или выбран хотя бы один фильтр
  const shouldShowGender =
    (genderOptions && genderOptions.length > 1) ||
    !!genderFilter;

  return (
    <div className="filter-bar flex flex-wrap items-center gap-2 mb-4">
      {/* Категория — только если showCategory и есть подкатегории */}
      {showCategory && submenuList.length > 0 && (
        <Select
          classNamePrefix="react-select"
          placeholder="Category"
          isClearable={false}
          value={
            categoryFilter
              ? submenuList.find(item => item.label === categoryFilter)
              : null
          }
          onChange={opt => setCategoryFilter(opt ? opt.label : "")}
          options={submenuList.map(item => ({
            value: item.label,
            label: item.label
          }))}
          menuPlacement="auto"
        />
      )}
      {/* Размер */}
      <Select
        classNamePrefix="react-select"
        placeholder="Size"
        isClearable
        value={sizeFilter ? { value: sizeFilter, label: sizeFilter } : null}
        onChange={opt => setSizeFilter(opt ? opt.value : "")}
        options={allSizes.map(size => ({ value: size, label: size }))}
        menuPlacement="auto"
      />
      {/* Gender */}
      {showGender && shouldShowGender && (
        <Select
          classNamePrefix="react-select"
          placeholder="Gender"
          isClearable
          value={
            genderOptions.find(opt => opt.value === genderFilter) || null
          }
          onChange={opt => setGenderFilter(opt ? opt.value : "")}
          options={genderOptions}
          menuPlacement="auto"
        />
      )}
      {/* Бренд */}
      <Select
        classNamePrefix="react-select"
        placeholder="Brand"
        isClearable
        value={brandFilter ? { value: brandFilter, label: brandFilter } : null}
        onChange={handleBrandChange}
        options={allBrands.map(brand => ({ value: brand, label: brand }))}
        menuPlacement="auto"
      />
      {/* Сброс */}
      {(sizeFilter || brandFilter || genderFilter || categoryFilter) && (
        <button
          onClick={clearFilters}
          className="px-3 py-[6px] rounded border border-gray-300 bg-white text-xs font-medium hover:bg-gray-100 ml-2"
          type="button"
          style={{ minHeight: 36, minWidth: 80 }}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

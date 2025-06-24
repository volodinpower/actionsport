import { useRef, useEffect } from "react";
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
  showCategory = true, // <- всегда true!
  allSizes = [],
  allBrands = [],
  forceOpenCategory = false,
  setForceOpenCategory = () => {},
}) {
  const categorySelectRef = useRef();

  useEffect(() => {
    if (forceOpenCategory && categorySelectRef.current) {
      categorySelectRef.current.focus();
      setForceOpenCategory(false);
    }
  }, [forceOpenCategory, setForceOpenCategory]);

  const handleBrandChange = (opt) => {
    setBrandFilter(opt ? opt.value : "");
    setCategoryFilter("");
  };

  const shouldShowGender =
    showGender &&
    ((genderOptions && genderOptions.length > 1) ||
      (!!genderFilter && genderOptions && genderOptions.length > 0));

  const selectedCategory = submenuList.find(item => item.query === categoryFilter) || null;

  // debug
  // console.log('FilterBar', { showCategory, submenuList, selectedCategory });

  return (
    <div className="filter-bar flex flex-wrap items-center gap-2 mb-4">
      {showCategory && submenuList.length > 0 && (
        <Select
          ref={categorySelectRef}
          classNamePrefix="react-select"
          placeholder="Category"
          isClearable={false}
          value={
            selectedCategory
              ? { value: selectedCategory.query, label: selectedCategory.label }
              : null
          }
          onChange={opt => {
            if (opt) setCategoryFilter(opt.value);
            else setCategoryFilter("");
          }}
          options={submenuList.map(item => ({
            value: item.query,
            label: item.label
          }))}
          menuPlacement="auto"
        />
      )}
      <Select
        classNamePrefix="react-select"
        placeholder="Size"
        isClearable
        value={sizeFilter ? { value: sizeFilter, label: sizeFilter } : null}
        onChange={opt => setSizeFilter(opt ? opt.value : "")}
        options={allSizes.map(size => ({ value: size, label: size }))}
        menuPlacement="auto"
      />
      {shouldShowGender && (
        <Select
          classNamePrefix="react-select"
          placeholder="Gender"
          isClearable
          value={genderOptions.find(opt => opt.value === genderFilter) || null}
          onChange={opt => setGenderFilter(opt ? opt.value : "")}
          options={genderOptions}
          menuPlacement="auto"
        />
      )}
      <Select
        classNamePrefix="react-select"
        placeholder="Brand"
        isClearable
        value={brandFilter ? { value: brandFilter, label: brandFilter } : null}
        onChange={handleBrandChange}
        options={allBrands.map(brand => ({ value: brand, label: brand }))}
        menuPlacement="auto"
      />
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

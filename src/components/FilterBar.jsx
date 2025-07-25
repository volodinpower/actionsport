import { useRef, useEffect } from "react";
import Select from "react-select";
import "./FilterBar.css";

// Для portal и высокого z-index для меню react-select
const portalProps = {
  menuPortalTarget: typeof window !== "undefined" ? document.body : null,
  styles: {
    menuPortal: base => ({ ...base, zIndex: 2000 }),
  },
};

export default function FilterBar({
  submenuList = [],
  sizeFilter,
  brandFilter,
  genderFilter,
  categoryFilter,
  genderOptions = [],
  allSizes = [],
  allBrands = [],
  forceOpenCategory = false,
  setForceOpenCategory = () => {},
  showGender = true,
  showCategory = true,
  brandsMode = false,
  hideBrandSelect = false,
  onCategoryChange,
  onBrandChange,
  onSizeChange,
  onGenderChange,
}) {
  const categorySelectRef = useRef();

  useEffect(() => {
    if (forceOpenCategory && categorySelectRef.current) {
      categorySelectRef.current.focus();
      setForceOpenCategory(false);
    }
  }, [forceOpenCategory, setForceOpenCategory]);

  const categoryOptions = submenuList.length > 0
    ? submenuList.map(sub => ({ value: sub, label: sub }))
    : [{ value: "", label: "All categories" }];

  const selectedCategory = categoryOptions.find(opt => opt.value === categoryFilter) || null;

  const shouldShowGender =
    showGender &&
    ((genderOptions && genderOptions.length > 1) ||
      (!!genderFilter && genderOptions && genderOptions.length > 0));

  return (
    <div className="filter-bar flex flex-wrap items-center gap-2 mb-4">
      {/* CATEGORY */}
      {showCategory && categoryOptions.length > 0 && (
        <Select
          classNamePrefix="react-select"
          placeholder="Category"
          isClearable={true}
          isSearchable={false}
          value={selectedCategory}
          onChange={opt => onCategoryChange(opt ? opt.value : "")}
          options={categoryOptions}
          menuPlacement="auto"
          ref={categorySelectRef}
          {...portalProps}
        />
      )}

      {/* BRAND */}
      {!hideBrandSelect && (
        <Select
          classNamePrefix="react-select"
          placeholder="Brand"
          isClearable={true}
          isSearchable={false}
          value={brandFilter ? { value: brandFilter, label: brandFilter } : null}
          onChange={opt => onBrandChange(opt ? opt.value : "")}
          options={allBrands.map(brand => ({ value: brand, label: brand }))}
          menuPlacement="auto"
          {...portalProps}
        />
      )}

      {/* SIZE */}
      <Select
        classNamePrefix="react-select"
        placeholder="Size"
        isClearable={true}
        isSearchable={false}
        value={sizeFilter ? { value: sizeFilter, label: sizeFilter } : null}
        onChange={opt => onSizeChange(opt ? opt.value : "")}
        options={allSizes.map(size => ({ value: size, label: size }))}
        menuPlacement="auto"
        {...portalProps}
      />

      {/* GENDER */}
      {shouldShowGender && (
        <Select
          classNamePrefix="react-select"
          placeholder="Gender"
          isClearable={true}
          isSearchable={false}
          value={genderOptions.find(opt => opt.value === genderFilter) || null}
          onChange={opt => onGenderChange(opt ? opt.value : "")}
          options={genderOptions}
          menuPlacement="auto"
          {...portalProps}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import Select, { components as selectComponents } from "react-select";
import "./FilterBar.css";

const menuPortalTarget =
  typeof window !== "undefined" ? document.body : null;

const baseSelectStyles = {
  menuPortal: base => ({ ...base, zIndex: 2000 }),
};

const multiSelectStyles = {
  ...baseSelectStyles,
  valueContainer: base => ({
    ...base,
    display: "flex",
    alignItems: "center",
  }),
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
  const filterBarRef = useRef();
  const categorySelectRef = useRef();
  const brandSelectRef = useRef();
  const sizeSelectRef = useRef();
  const genderSelectRef = useRef();

  const [openMenu, setOpenMenu] = useState(null);

  const blurAndCloseSelect = (ref) => {
    const instance = ref.current;
    if (!instance) return;

    if (typeof instance.blur === "function") instance.blur();
    else if (typeof instance.blurInput === "function") instance.blurInput();
  };

  const closeOtherMenus = (currentKey) => {
    if (currentKey !== "category") blurAndCloseSelect(categorySelectRef);
    if (currentKey !== "brand") blurAndCloseSelect(brandSelectRef);
    if (currentKey !== "size") blurAndCloseSelect(sizeSelectRef);
    if (currentKey !== "gender") blurAndCloseSelect(genderSelectRef);
  };

  const focusAndOpenSelect = (ref) => {
    const instance = ref.current;
    if (!instance) return;

    if (typeof instance.focus === "function") instance.focus();
    if (typeof instance.openMenu === "function") instance.openMenu("first");
  };

  const handleSelectActivation = (menuKey, ref) => {
    closeOtherMenus(menuKey);
    focusAndOpenSelect(ref);
    setOpenMenu(menuKey);
  };

  const handleMenuOpen = (key) => setOpenMenu(key);
  const handleMenuClose = (key) => {
    setOpenMenu((prev) => (prev === key ? null : prev));
  };

  const closeAllMenus = () => {
    setOpenMenu(null);
    blurAndCloseSelect(categorySelectRef);
    blurAndCloseSelect(brandSelectRef);
    blurAndCloseSelect(sizeSelectRef);
    blurAndCloseSelect(genderSelectRef);
  };

  const handleClearAction = (actionMeta) => {
    if (actionMeta?.action === "clear") closeAllMenus();
  };

  // Custom components for multiselect
  const multiSelectComponents = {
    Option: (props) => (
      <selectComponents.Option {...props}>
        <span
          className={[
            "filter-option-icon",
            props.isSelected ? "selected" : "",
            props.isSelected && props.isFocused ? "removable" : "",
          ].join(" ")}
        >
          {props.isSelected ? (props.isFocused ? "✕" : "✓") : ""}
        </span>
        <span>{props.label}</span>
      </selectComponents.Option>
    ),
    ClearIndicator: (props) => {
      const handleMouseDown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        props.clearValue();
        closeAllMenus();
      };
      return (
        <selectComponents.ClearIndicator
          {...props}
          innerProps={{
            ...props.innerProps,
            onMouseDown: handleMouseDown,
          }}
        />
      );
    },
    MultiValue: () => null,
    MultiValueContainer: () => null,
    Placeholder: () => null,

    ValueContainer: (props) => {
      const selectedValues = props.getValue();
      const hasValue = selectedValues.length > 0;

      const summary = hasValue
        ? [
            selectedValues.slice(0, 2).map((o) => o.label).join(", "),
            selectedValues.length > 2 ? `+${selectedValues.length - 2}` : "",
          ]
            .filter(Boolean)
            .join(" ")
        : props.selectProps.placeholder;

      const fullSummary = selectedValues.map((o) => o.label).join(", ");

      const handleClick = (event) => {
        if (
          event?.target?.closest?.(".react-select__dropdown-indicator") ||
          event?.target?.closest?.(".react-select__clear-indicator")
        ) {
          return;
        }

        props.selectProps.onValueContainerMouseDown?.(event);
      };

      return (
        <selectComponents.ValueContainer
          {...props}
          innerProps={{
            ...props.innerProps,
            onMouseDown: (event) => {
              const isIndicator =
                event.target.closest(".react-select__dropdown-indicator") ||
                event.target.closest(".react-select__clear-indicator");
              if (isIndicator) {
                props.innerProps?.onMouseDown?.(event);
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              props.selectProps.onValueContainerMouseDown?.(event);
            },
          }}
        >
          <span
            className={[
              "filter-value-summary",
              hasValue ? "has-value" : "placeholder",
            ].join(" ")}
            title={fullSummary}
          >
            {summary}
          </span>
          {props.children}
        </selectComponents.ValueContainer>
      );
    },
  };

  // Универсальный обработчик клика по полю любого селекта
  const createValueContainerMouseDown =
    (menuKey, ref) => (event) => {
      if (
        event?.target?.closest?.(".react-select__dropdown-indicator") ||
        event?.target?.closest?.(".react-select__clear-indicator")
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      if (openMenu === menuKey) {
        blurAndCloseSelect(ref);
        setOpenMenu(null);
        return;
      }

      handleSelectActivation(menuKey, ref);
    };

  // Click outside → close menus
  useEffect(() => {
    const onDown = (event) => {
      const target = event.target;

      const insideMenu =
        target instanceof Element &&
        !!target.closest(".react-select__menu");
      if (insideMenu) return;

      const insideFilter =
        target instanceof Element &&
        filterBarRef.current?.contains(target);
      if (insideFilter) return;

      closeAllMenus();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  // Force open category
  useEffect(() => {
    if (forceOpenCategory && categorySelectRef.current) {
      handleSelectActivation("category", categorySelectRef);
      setForceOpenCategory(false);
    }
  }, [forceOpenCategory, setForceOpenCategory]);

  // Normalization
  const normalizeMultiValue = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const categoryOptions =
    submenuList.length > 0
      ? submenuList
      : [{ value: "", label: "All categories" }];

  const selectedCategory =
    categoryOptions.find((o) => o.value === categoryFilter) || null;

  const selectedBrandValues = normalizeMultiValue(brandFilter);
  const selectedSizeValues = normalizeMultiValue(sizeFilter);

  const shouldShowGender =
    showGender &&
    ((genderOptions && genderOptions.length > 1) ||
      (!!genderFilter && genderOptions.length > 0));

  return (
    <div
      ref={filterBarRef}
      className="filter-bar flex flex-wrap items-center gap-2 mb-4"
    >
      {/* CATEGORY */}
      {showCategory && (
        <Select
          classNamePrefix="react-select"
          placeholder="Category"
          isClearable
          isSearchable={false}
          value={selectedCategory}
          onChange={(opt, actionMeta) => {
            handleClearAction(actionMeta);
            onCategoryChange(opt ? opt.value : "");
          }}
          options={categoryOptions}
          styles={baseSelectStyles}
          ref={categorySelectRef}
          menuPortalTarget={menuPortalTarget}
          menuIsOpen={openMenu === "category"}
          onMenuOpen={() => handleMenuOpen("category")}
          onMenuClose={() => handleMenuClose("category")}
          onValueContainerMouseDown={createValueContainerMouseDown(
            "category",
            categorySelectRef
          )}
        />
      )}

      {/* BRAND */}
      {!hideBrandSelect && (
        <Select
          classNamePrefix="react-select"
          placeholder="Brand"
          isClearable
          isMulti
          hideSelectedOptions={false}
          closeMenuOnSelect={false}
          controlShouldRenderValue={false}
          isSearchable={false}
          value={selectedBrandValues.map((v) => ({ value: v, label: v }))}
          onChange={(opts, actionMeta) => {
            handleClearAction(actionMeta);
            onBrandChange(
              Array.isArray(opts) ? opts.map((o) => o.value).join(",") : ""
            );
          }}
          options={allBrands.map((b) => ({ value: b, label: b }))}
          styles={multiSelectStyles}
          ref={brandSelectRef}
          menuPortalTarget={menuPortalTarget}
          menuIsOpen={openMenu === "brand"}
          onMenuOpen={() => handleMenuOpen("brand")}
          onMenuClose={() => handleMenuClose("brand")}
          onValueContainerMouseDown={createValueContainerMouseDown(
            "brand",
            brandSelectRef
          )}
          components={multiSelectComponents}
        />
      )}

      {/* SIZE */}
      <Select
        classNamePrefix="react-select"
        placeholder="Size"
        isClearable
        isMulti
        hideSelectedOptions={false}
        closeMenuOnSelect={false}
        controlShouldRenderValue={false}
        isSearchable={false}
        value={selectedSizeValues.map((v) => ({ value: v, label: v }))}
        onChange={(opts, actionMeta) => {
          handleClearAction(actionMeta);
          onSizeChange(
            Array.isArray(opts) ? opts.map((o) => o.value).join(",") : ""
          );
        }}
        options={allSizes.map((s) => ({ value: s, label: s }))}
        styles={multiSelectStyles}
        ref={sizeSelectRef}
        menuPortalTarget={menuPortalTarget}
        menuIsOpen={openMenu === "size"}
        onMenuOpen={() => handleMenuOpen("size")}
        onMenuClose={() => handleMenuClose("size")}
        onValueContainerMouseDown={createValueContainerMouseDown(
          "size",
          sizeSelectRef
        )}
        components={multiSelectComponents}
      />

      {/* GENDER */}
      {shouldShowGender && (
        <Select
          classNamePrefix="react-select"
          placeholder="Gender"
          isClearable
          isSearchable={false}
          value={genderOptions.find((o) => o.value === genderFilter) || null}
          onChange={(opt, actionMeta) => {
            handleClearAction(actionMeta);
            onGenderChange(opt ? opt.value : "");
          }}
          options={genderOptions}
          styles={baseSelectStyles}
          ref={genderSelectRef}
          menuPortalTarget={menuPortalTarget}
          menuIsOpen={openMenu === "gender"}
          onMenuOpen={() => handleMenuOpen("gender")}
          onMenuClose={() => handleMenuClose("gender")}
          onValueContainerMouseDown={createValueContainerMouseDown(
            "gender",
            genderSelectRef
          )}
        />
      )}
    </div>
  );
}

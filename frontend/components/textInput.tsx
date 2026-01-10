import { useField } from "formik";

export const TextInput = ({ label, hidden = false, ...props }: any) => {
    const [field, meta] = useField(props);
  
    return (
      <div className={`${!hidden ? 'flex flex-col gap-2 w-full' : 'hidden'}`}>
        
        <div className="flex flex-row w-full gap-4">
            <label htmlFor={props.id || props.name}>{label}</label>
            {meta.touched && meta.error ? (
            <span className="font-extrabold text-red-500 text-xs">{meta.error}</span>
            ) : null}
        </div>
        
        <input
          className="border-solid border-[1px] border-gray-300 p-2 rounded-md"
          {...field}
          {...props}
        />
        
      </div>
    );
  };
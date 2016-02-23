;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
'use strict';
/* globals window, angular */

window.vlSchema = dl.json('bower_components/vega-lite/vega-lite-schema.json');

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('dl', window.dl)
  .constant('vl', window.vl)
  .constant('vg', window.vg)
  // other libraries
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    defaultTimeFn: 'year',
    typeNames: {
      nominal: 'text',
      ordinal: 'text-ordinal',
      quantitative: 'number',
      temporal: 'time',
      geographic: 'geo'
    }
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button on-close=\"logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.length }})</h2><a ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.length > 0\" class=\"hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in Bookmarks.dict | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\"></vl-plot-group></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCountCaret || fieldDef.aggregate!==\'count\'}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeNames[fieldDef.type]}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ fieldDef.field | underscore2space }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\'\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink info\" ng-show=\"showInfo\"><i ng-if=\"fieldDef.aggregate !== \'count\' && containsType([vlType.NOMINAL, vlType.ORDINAL], fieldDef.type)\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min}}<br> <strong>Max:</strong> {{stats.max}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.TEMPORAL\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | date: short}}<br> <strong>Max:</strong> {{stats.max | date: short}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i> <i ng-if=\"fieldDef.aggregate !== \'count\' && fieldDef.type === vlType.QUANTITATIVE\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Name:</strong> {{fieldDef.field}}<br> <strong>Cardinality:</strong> {{stats.distinct | number}}<br> <strong>Min:</strong> {{stats.min | number}}<br> <strong>Max:</strong> {{stats.max | number}}<br> <strong>Stdev:</strong> {{stats.stdev | number:2}}<br> <strong>Mean:</strong> {{stats.mean | number:2}}<br> <strong>Median:</strong> {{stats.median | number}}<br> <strong>Sample:</strong> <span class=\'sample\'>{{stats.sample.join(\', \')}}</span> </div>\" tooltip-side=\"right\"></i><i ng-if=\"fieldDef.aggregate === \'count\'\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<div class=\'tooltip-content\'> <strong>Count:</strong> {{stats.max}} </div>\" tooltip-side=\"right\"></i></span></span></span>");
$templateCache.put("modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && (maxHeight && (!height || height <= maxHeight)) && (maxWidth && (!width || width <= maxWidth)), overflow: alwaysScrollable || overflow || (maxHeight && height && height > maxHeight) || (maxWidth && width && width > maxWidth), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseover=\"mouseover()\" ng-mouseout=\"mouseout()\"><div class=\"vis-tooltip\" ng-show=\"tooltipActive\"><table><tr ng-repeat=\"p in data\"><td class=\"key\">{{p[0]}}</td><td class=\"value\"><b>{{p[1]}}</b></td></tr></table></div></div>");
$templateCache.put("vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet\" field-def=\"fieldDef\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field] }\" ng-mouseover=\"(highlighted||{})[fieldDef.field] = true\" ng-mouseout=\"(highlighted||{})[fieldDef.field] = false\"></field-info></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\" ng-mouseover=\"initializePopup();\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showMark\" class=\"command disabled\"><i class=\"fa fa-font\"></i> <i class=\"fa fa-line-chart\"></i> <i class=\"fa fa-area-chart\"></i> <i class=\"fa fa-bar-chart\"></i> <i class=\"fa fa-circle-o\"></i></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec, Dataset.stats)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" ng-class=\"{active: chart.vlSpec && chart.vlSpec.cfg.filterNull.O}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" ng-click=\"Bookmarks.toggle(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a></div></div><vl-plot class=\"flex-grow-1\" data-fieldset=\"{fieldSet.key}}\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" max-height=\"maxHeight\" max-width=\"maxWidth\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot></div>");
$templateCache.put("vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vls</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"shCopied=\'(Copied)\'\" zeroclip-model=\"chart.shorthand\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'VL shorthand\', chart.shorthand); shCopied=\'(Logged)\';\">Log</a> <span>{{shCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', 'Logger', function (Bookmarks, consts, Logger) {
    return {
      templateUrl: 'bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        // The bookmark list is designed to render within a modal overlay.
        // Because modal contents are hidden via ng-if, if this link function is
        // executing it is because the directive is being shown. Log the event:
        Logger.logInteraction(Logger.actions.BOOKMARK_OPEN);
        scope.logBookmarksClosed = function() {
          Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
        };

        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.dict = {};
      this.length = 0;
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.updateLength = function() {
      this.length = Object.keys(this.dict).length;
    };

    proto.save = function() {
      localStorageService.set('bookmarks', this.dict);
    };

    proto.load = function() {
      this.dict = localStorageService.get('bookmarks') || {};
      this.updateLength();
    };

    proto.clear = function() {
      this.dict = {};
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.toggle = function(chart) {
      var shorthand = chart.shorthand;

      if (this.dict[shorthand]) {
        this.remove(chart);
      } else {
        this.add(chart);
      }
    };

    proto.add = function(chart) {
      var shorthand = chart.shorthand;

      console.log('adding', chart.vlSpec, shorthand);

      chart.timeAdded = (new Date().getTime());

      chart.stats = Dataset.stats;

      this.dict[shorthand] = _.cloneDeep(chart);
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand);
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      console.log('removing', chart.vlSpec, shorthand);

      delete this.dict[shorthand];
      this.updateLength();
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand);
    };

    proto.isBookmarked = function(shorthand) {
      return shorthand in this.dict;
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', function() {
    var Config = {};

    Config.data = {};
    Config.config = {};

    Config.getConfig = function() {
      return {};
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        cell: {
          width: 400,
          height: 400
        },
        facet: {
          cell: {
            width: 200,
            height: 200
          }
        }
      };
    };

    Config.small = function() {
      return {
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        }
      };
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['Dataset', 'Drop', 'vl', 'consts', '_', function (Dataset, Drop, vl, consts, _) {
    return {
      templateUrl: 'fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '=',
        showType: '=',
        showInfo: '=',
        showCaret: '=',
        popupContent: '=',
        showRemove: '=',
        removeAction: '&',
        action: '&',
        disableCountCaret: '='
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;
        scope.typeNames = consts.typeNames;
        scope.stats = Dataset.stats[scope.fieldDef.field];
        scope.containsType = function(types, type) {
          return _.includes(types, type);
        };

        switch(scope.fieldDef.type){
          case vl.type.ORDINAL:
            scope.icon = 'fa-font';
            break;
          case vl.type.NOMINAL:
            scope.icon = 'fa-font';
            break;
          case vl.type.QUANTITATIVE:
            scope.icon = 'icon-hash';
            break;
          case vl.type.TEMPORAL:
            scope.icon = 'fa-calendar';
            break;
        }

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(fieldDef) {
          return fieldDef.aggregate || fieldDef.timeUnit ||
            (fieldDef.bin && 'bin') ||
            fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto');
        };

        scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        scope.$on('$destroy', function() {
          if (funcsPopup) {
            funcsPopup.destroy();
          }
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.where(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.where(Dataset.datasets, {
          group: 'sample'
        });

        scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

function getNameMap(dataschema) {
  return dataschema.reduce(function(m, fieldDef) {
    m[fieldDef.field] = fieldDef;
    return m;
  }, {});
}

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'dl', 'vl', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, dl, vl, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.dataschema.byName = {};
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrderBy.cardinality = function(fieldDef, stats) {
      return stats[fieldDef.field].distinct;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    Dataset.getSchema = function(data, stats, order) {
      var types = dl.type.inferAll(data),
        schema = _.reduce(types, function(s, type, field) {
          var fieldDef = {
            field: field,
            type: vl.data.types[type],
            primitiveType: type
          };

          if (fieldDef.type === vl.type.QUANTITATIVE && stats[fieldDef.field].distinct <= 5) {
            fieldDef.type = vl.type.ORDINAL;
          }

          s.push(fieldDef);
          return s;
        }, []);

      schema = dl.stablesort(schema, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      schema.push(vl.fieldDef.count());
      return schema;
    };

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          Dataset.updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = dl.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          Dataset.updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    Dataset.updateFromData = function(dataset, data) {
      Dataset.data = data;

      Dataset.currentDataset = dataset;
      Dataset.stats = dl.summary(data).reduce(function(s, profile) {
        s[profile.field] = profile;
        return s;
      }, {
        '*': {
          max: data.length,
          min: 0
        }
      });

      for (var fieldName in Dataset.stats) {
        if (fieldName !== '*') {
          Dataset.stats[fieldName].sample = _.sample(_.map(Dataset.data, fieldName), 7);
        }
      }

      Dataset.dataschema = Dataset.getSchema(Dataset.data, Dataset.stats);
      Dataset.dataschema.byName = getNameMap(Dataset.dataschema);
    };

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'dl', function (Dataset, Logger, Config, _, dl) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = dl.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', 'consts', 'Analytics', function ($location, $window, consts, Analytics) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},

      //POLESTAR
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.DEBUG},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.DEBUG},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.DEBUG}
    };

    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels.INFO.rank) {
        Analytics.trackEvent(action.category, action.id, label, value);
        console.log('[Logging] ', action.id, label, data);
      }
    };

    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '=',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        'closeCallback': '&onClose'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeCallback) {
            scope.closeCallback();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', function() {
    var Schema = {};

    Schema.schema = window.vlSchema;

    Schema.getChannelSchema = function(channel) {
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      var ref = encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref;
      var def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['dl', 'vl', 'vg', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(dl, vl, vg, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return b.priority - a.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight:'=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500,
          TOOLTIP_TIMEOUT = 250;

        scope.visId = (counter++);
        scope.hoverPromise = null;
        scope.tooltipPromise = null;
        scope.hoverFocus = false;
        scope.tooltipActive = false;
        scope.destroyed = false;

        var format = dl.format.number('');

        scope.mouseover = function() {
          scope.hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, '', scope.chart.vlSpec);
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseout = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, '', scope.chart.vlSpec);
          }

          $timeout.cancel(scope.hoverPromise);
          scope.hoverFocus = scope.unlocked = false;
        };

        function viewOnMouseOver(event, item) {
          if (!item || !item.datum) { return; }

          scope.tooltipPromise = $timeout(function activateTooltip(){

            // avoid showing tooltip for facet's background
            if (item.datum._facetID) return;

            scope.tooltipActive = true;
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum);


            // convert data into a format that we can easily use with ng table and ng-repeat
            // TODO: revise if this is actually a good idea
            scope.data = _(item.datum).omit('_prev', '_id') // omit vega internals
              .pairs().value()
              .map(function(p) {
                p[1] = dl.isNumber(p[1]) ? format(p[1]) : p[1];
                return p;
              });
            scope.$digest();

            var tooltip = element.find('.vis-tooltip'),
              $body = angular.element($document),
              width = tooltip.width(),
              height= tooltip.height();

            // put tooltip above if it's near the screen's bottom border
            if (event.pageY+10+height < $body.height()) {
              tooltip.css('top', (event.pageY+10));
            } else {
              tooltip.css('top', (event.pageY-10-height));
            }

            // put tooltip on left if it's near the screen's right border
            if (event.pageX+10+ width < $body.width()) {
              tooltip.css('left', (event.pageX+10));
            } else {
              tooltip.css('left', (event.pageX-10-width));
            }
          }, TOOLTIP_TIMEOUT);
        }

        function viewOnMouseOut(event, item) {
          //clear positions
          var tooltip = element.find('.vis-tooltip');
          tooltip.css('top', null);
          tooltip.css('left', null);
          $timeout.cancel(scope.tooltipPromise);
          if (scope.tooltipActive) {
            Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum);
          }
          scope.tooltipActive = false;
          scope.data = [];
          scope.$digest();
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) return;

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          dl.extend(vlSpec.config, Config[configSet]());

          // use chart stats if available (for example from bookmarks)
          var stats = scope.chart.stats || Dataset.stats;

          // Special Rules
          var encoding = vlSpec.encoding;
          if (encoding) {
            // put x-axis on top if too high-cardinality
            if (encoding.y && encoding.y.field && [vl.type.NOMINAL, vl.type.ORDINAL].indexOf(encoding.y.type) > -1) {
              if (encoding.x) {
                var fieldStats = stats[encoding.y.field];
                if (fieldStats && vl.fieldDef.cardinality(encoding.y, stats) > 30) {
                  (encoding.x.axis = encoding.x.axis || {}).orient = 'top';
                }
              }
            }

            // Use smaller band size if has X or Y has cardinality > 10 or has a facet
            if (encoding.row ||
                (encoding.y && stats[encoding.y.field] && vl.fieldDef.cardinality(encoding.y, stats) > 10)) {
              (encoding.y.scale = encoding.y.scale || {}).bandSize = 12;
            }

            if (encoding.column ||
                (encoding.x && stats[encoding.x.field] && vl.fieldDef.cardinality(encoding.x, stats) > 10)) {
              (encoding.x.scale = encoding.x.scale || {}).bandSize = 12;
            }

            if (encoding.color && encoding.color.type === vl.type.NOMINAL &&
                vl.fieldDef.cardinality(encoding.color, stats) > 10) {
              (encoding.color.scale = encoding.color.scale || {}).range = 'category20';
            }
          }

          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? vl.shorthand.shorten(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }

        function render(spec) {
          if (!spec) {
            if (view) {
              view.off('mouseover');
              view.off('mouseout');
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          scope.renderer = getRenderer(spec);

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart.fieldSetKey))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(chart) {
              try {
                var endParse = new Date().getTime();
                view = null;
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                // view.renderer(getRenderer(spec.width, scope.height));
                view.update();

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, '', scope.chart.vlSpec);
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  view.on('mouseover', viewOnMouseOver);
                  view.on('mouseout', viewOnMouseOut);
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNext();
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var view;
        scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            view.off('mouseover');
            view.off('mouseout');
            view = null;
          }
          var shorthand = getShorthand();
          if (consts.debug && $window.views) {
            delete $window.views[shorthand];
          }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'dl', 'vl', 'Dataset', 'Logger', '_', function (Bookmarks, consts, dl, vl, Dataset, Logger, _) {
    return {
      templateUrl: 'vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '=',
        isInList: '=',

        alwaysScrollable: '=',
        configSet: '@',
        maxHeight: '=',
        maxWidth: '=',
        overflow: '=',
        priority: '=',
        rescale: '=',
        thumbnail: '=',
        tooltip: '=',

        /* vlplotgroup specific */

        fieldSet: '=',

        showBookmark: '@',
        showDebug: '=',
        showExpand: '=',
        showFilterNull: '@',
        showLabel: '@',
        showLog: '@',
        showMark: '@',
        showSort: '@',
        showTranspose: '@',

        alwaysSelected: '=',
        isSelected: '=',
        highlighted: '=',
        expandAction: '&',
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
        scope.Dataset = Dataset;

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          scale.type = scale.type === 'log' ? 'linear' : 'log';
          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand);
        };
        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          return scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand);

          spec.config = spec.config || {};
          spec.config.filterNull = spec.config.filterNull === true ? undefined : true;
        };

        scope.toggleFilterNull.support = function(spec, stats) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) &&
                (fieldDef.name in stats) &&
                stats[fieldDef.name].missing > 0
              ) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {
          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand);
          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          console.log('toggleSort', currentMode, newMode);

          var channels = toggleSort.channels(spec);
          spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (dl.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec, stats) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.spec.alwaysNoOcclusion(spec, stats)) {
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec, Dataset.stats)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand);
          vl.spec.transpose(scope.chart.vlSpec);
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiYWxlcnRtZXNzYWdlcy9hbGVydG1lc3NhZ2VzLmpzIiwiYWxlcnRzL2FsZXJ0cy5zZXJ2aWNlLmpzIiwiYm9va21hcmtsaXN0L2Jvb2ttYXJrbGlzdC5qcyIsImJvb2ttYXJrcy9ib29rbWFya3Muc2VydmljZS5qcyIsImNvbmZpZy9jb25maWcuc2VydmljZS5qcyIsImZpZWxkaW5mby9maWVsZGluZm8uanMiLCJkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5qcyIsImRhdGFzZXQvYWRkdXJsZGF0YXNldC5qcyIsImRhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5qcyIsImRhdGFzZXQvZGF0YXNldC5zZXJ2aWNlLmpzIiwiZGF0YXNldC9kYXRhc2V0bW9kYWwuanMiLCJkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5qcyIsImRhdGFzZXQvZmlsZWRyb3B6b25lLmpzIiwiZGF0YXNldC9wYXN0ZWRhdGFzZXQuanMiLCJkYXRhc2V0L3NhbXBsZWRhdGEuanMiLCJsb2dnZXIvbG9nZ2VyLnNlcnZpY2UuanMiLCJtb2RhbC9tb2RhbC5qcyIsIm1vZGFsL21vZGFsY2xvc2VidXR0b24uanMiLCJtb2RhbC9tb2RhbHMuc2VydmljZS5qcyIsInNjaGVtYS9zY2hlbWEuc2VydmljZS5qcyIsInRhYnMvdGFiLmpzIiwidGFicy90YWJzZXQuanMiLCJ2bHBsb3QvdmxwbG90LmpzIiwidmxwbG90Z3JvdXAvdmxwbG90Z3JvdXAuanMiLCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmpzIiwiZmlsdGVycy9jb21wYWN0anNvbi9jb21wYWN0anNvbi5maWx0ZXIuanMiLCJmaWx0ZXJzL3JlcG9ydHVybC9yZXBvcnR1cmwuZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvdW5kZXJzY29yZTJzcGFjZS91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LE9BQU8sVUFBVSxrQkFBa0I7UUFDbkMsT0FBTyxzQkFBc0IsT0FBTzs7TUFFdEMsT0FBTzs7O0lBR1QsT0FBTyxPQUFPLFVBQVUsWUFBWSxnQkFBZ0I7TUFDbkQ7Ozs7QUMzREw7Ozs7Ozs7Ozs7QUFVQSxRQUFRLE9BQU87R0FDWixPQUFPLGFBQWEsWUFBWTtJQUMvQixPQUFPLFVBQVUsT0FBTztNQUN0QixPQUFPLE9BQU8sVUFBVTs7S0FFekI7Ozs7QUNmTDs7Ozs7Ozs7OztBQVVBLFFBQVEsT0FBTztHQUNaLE9BQU8sb0JBQW9CLFlBQVk7SUFDdEMsT0FBTyxVQUFVLE9BQU87TUFDdEIsT0FBTyxRQUFRLE1BQU0sUUFBUSxPQUFPLE9BQU87O0tBRTVDIiwiZmlsZSI6InZsdWkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqIEpTT04zIHdpdGggY29tcGFjdCBzdHJpbmdpZnkgLS0gTW9kaWZpZWQgYnkgS2FuaXQgV29uZ3N1cGhhc2F3YXQuICAgaHR0cHM6Ly9naXRodWIuY29tL2thbml0dy9qc29uM1xuICpcbiAqIEZvcmtlZCBmcm9tIEpTT04gdjMuMy4yIHwgaHR0cHM6Ly9iZXN0aWVqcy5naXRodWIuaW8vanNvbjMgfCBDb3B5cmlnaHQgMjAxMi0yMDE0LCBLaXQgQ2FtYnJpZGdlIHwgaHR0cDovL2tpdC5taXQtbGljZW5zZS5vcmdcbiAqL1xuOyhmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCB0aGUgYGRlZmluZWAgZnVuY3Rpb24gZXhwb3NlZCBieSBhc3luY2hyb25vdXMgbW9kdWxlIGxvYWRlcnMuIFRoZVxuICAvLyBzdHJpY3QgYGRlZmluZWAgY2hlY2sgaXMgbmVjZXNzYXJ5IGZvciBjb21wYXRpYmlsaXR5IHdpdGggYHIuanNgLlxuICB2YXIgaXNMb2FkZXIgPSB0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZDtcblxuICAvLyBBIHNldCBvZiB0eXBlcyB1c2VkIHRvIGRpc3Rpbmd1aXNoIG9iamVjdHMgZnJvbSBwcmltaXRpdmVzLlxuICB2YXIgb2JqZWN0VHlwZXMgPSB7XG4gICAgXCJmdW5jdGlvblwiOiB0cnVlLFxuICAgIFwib2JqZWN0XCI6IHRydWVcbiAgfTtcblxuICAvLyBEZXRlY3QgdGhlIGBleHBvcnRzYCBvYmplY3QgZXhwb3NlZCBieSBDb21tb25KUyBpbXBsZW1lbnRhdGlvbnMuXG4gIHZhciBmcmVlRXhwb3J0cyA9IG9iamVjdFR5cGVzW3R5cGVvZiBleHBvcnRzXSAmJiBleHBvcnRzICYmICFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG5cbiAgLy8gVXNlIHRoZSBgZ2xvYmFsYCBvYmplY3QgZXhwb3NlZCBieSBOb2RlIChpbmNsdWRpbmcgQnJvd3NlcmlmeSB2aWFcbiAgLy8gYGluc2VydC1tb2R1bGUtZ2xvYmFsc2ApLCBOYXJ3aGFsLCBhbmQgUmluZ28gYXMgdGhlIGRlZmF1bHQgY29udGV4dCxcbiAgLy8gYW5kIHRoZSBgd2luZG93YCBvYmplY3QgaW4gYnJvd3NlcnMuIFJoaW5vIGV4cG9ydHMgYSBgZ2xvYmFsYCBmdW5jdGlvblxuICAvLyBpbnN0ZWFkLlxuICB2YXIgcm9vdCA9IG9iamVjdFR5cGVzW3R5cGVvZiB3aW5kb3ddICYmIHdpbmRvdyB8fCB0aGlzLFxuICAgICAgZnJlZUdsb2JhbCA9IGZyZWVFeHBvcnRzICYmIG9iamVjdFR5cGVzW3R5cGVvZiBtb2R1bGVdICYmIG1vZHVsZSAmJiAhbW9kdWxlLm5vZGVUeXBlICYmIHR5cGVvZiBnbG9iYWwgPT0gXCJvYmplY3RcIiAmJiBnbG9iYWw7XG5cbiAgaWYgKGZyZWVHbG9iYWwgJiYgKGZyZWVHbG9iYWxbXCJnbG9iYWxcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcIndpbmRvd1wiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wic2VsZlwiXSA9PT0gZnJlZUdsb2JhbCkpIHtcbiAgICByb290ID0gZnJlZUdsb2JhbDtcbiAgfVxuXG4gIC8vIFB1YmxpYzogSW5pdGlhbGl6ZXMgSlNPTiAzIHVzaW5nIHRoZSBnaXZlbiBgY29udGV4dGAgb2JqZWN0LCBhdHRhY2hpbmcgdGhlXG4gIC8vIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgIGZ1bmN0aW9ucyB0byB0aGUgc3BlY2lmaWVkIGBleHBvcnRzYCBvYmplY3QuXG4gIGZ1bmN0aW9uIHJ1bkluQ29udGV4dChjb250ZXh0LCBleHBvcnRzKSB7XG4gICAgY29udGV4dCB8fCAoY29udGV4dCA9IHJvb3RbXCJPYmplY3RcIl0oKSk7XG4gICAgZXhwb3J0cyB8fCAoZXhwb3J0cyA9IHJvb3RbXCJPYmplY3RcIl0oKSk7XG5cbiAgICAvLyBOYXRpdmUgY29uc3RydWN0b3IgYWxpYXNlcy5cbiAgICB2YXIgTnVtYmVyID0gY29udGV4dFtcIk51bWJlclwiXSB8fCByb290W1wiTnVtYmVyXCJdLFxuICAgICAgICBTdHJpbmcgPSBjb250ZXh0W1wiU3RyaW5nXCJdIHx8IHJvb3RbXCJTdHJpbmdcIl0sXG4gICAgICAgIE9iamVjdCA9IGNvbnRleHRbXCJPYmplY3RcIl0gfHwgcm9vdFtcIk9iamVjdFwiXSxcbiAgICAgICAgRGF0ZSA9IGNvbnRleHRbXCJEYXRlXCJdIHx8IHJvb3RbXCJEYXRlXCJdLFxuICAgICAgICBTeW50YXhFcnJvciA9IGNvbnRleHRbXCJTeW50YXhFcnJvclwiXSB8fCByb290W1wiU3ludGF4RXJyb3JcIl0sXG4gICAgICAgIFR5cGVFcnJvciA9IGNvbnRleHRbXCJUeXBlRXJyb3JcIl0gfHwgcm9vdFtcIlR5cGVFcnJvclwiXSxcbiAgICAgICAgTWF0aCA9IGNvbnRleHRbXCJNYXRoXCJdIHx8IHJvb3RbXCJNYXRoXCJdLFxuICAgICAgICBuYXRpdmVKU09OID0gY29udGV4dFtcIkpTT05cIl0gfHwgcm9vdFtcIkpTT05cIl07XG5cbiAgICAvLyBEZWxlZ2F0ZSB0byB0aGUgbmF0aXZlIGBzdHJpbmdpZnlgIGFuZCBgcGFyc2VgIGltcGxlbWVudGF0aW9ucy5cbiAgICBpZiAodHlwZW9mIG5hdGl2ZUpTT04gPT0gXCJvYmplY3RcIiAmJiBuYXRpdmVKU09OKSB7XG4gICAgICBleHBvcnRzLnN0cmluZ2lmeSA9IG5hdGl2ZUpTT04uc3RyaW5naWZ5O1xuICAgICAgZXhwb3J0cy5wYXJzZSA9IG5hdGl2ZUpTT04ucGFyc2U7XG4gICAgfVxuXG4gICAgLy8gQ29udmVuaWVuY2UgYWxpYXNlcy5cbiAgICB2YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlLFxuICAgICAgICBnZXRDbGFzcyA9IG9iamVjdFByb3RvLnRvU3RyaW5nLFxuICAgICAgICBpc1Byb3BlcnR5LCBmb3JFYWNoLCB1bmRlZjtcblxuICAgIC8vIFRlc3QgdGhlIGBEYXRlI2dldFVUQypgIG1ldGhvZHMuIEJhc2VkIG9uIHdvcmsgYnkgQFlhZmZsZS5cbiAgICB2YXIgaXNFeHRlbmRlZCA9IG5ldyBEYXRlKC0zNTA5ODI3MzM0NTczMjkyKTtcbiAgICB0cnkge1xuICAgICAgLy8gVGhlIGBnZXRVVENGdWxsWWVhcmAsIGBNb250aGAsIGFuZCBgRGF0ZWAgbWV0aG9kcyByZXR1cm4gbm9uc2Vuc2ljYWxcbiAgICAgIC8vIHJlc3VsdHMgZm9yIGNlcnRhaW4gZGF0ZXMgaW4gT3BlcmEgPj0gMTAuNTMuXG4gICAgICBpc0V4dGVuZGVkID0gaXNFeHRlbmRlZC5nZXRVVENGdWxsWWVhcigpID09IC0xMDkyNTIgJiYgaXNFeHRlbmRlZC5nZXRVVENNb250aCgpID09PSAwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDRGF0ZSgpID09PSAxICYmXG4gICAgICAgIC8vIFNhZmFyaSA8IDIuMC4yIHN0b3JlcyB0aGUgaW50ZXJuYWwgbWlsbGlzZWNvbmQgdGltZSB2YWx1ZSBjb3JyZWN0bHksXG4gICAgICAgIC8vIGJ1dCBjbGlwcyB0aGUgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBkYXRlIG1ldGhvZHMgdG8gdGhlIHJhbmdlIG9mXG4gICAgICAgIC8vIHNpZ25lZCAzMi1iaXQgaW50ZWdlcnMgKFstMiAqKiAzMSwgMiAqKiAzMSAtIDFdKS5cbiAgICAgICAgaXNFeHRlbmRlZC5nZXRVVENIb3VycygpID09IDEwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWludXRlcygpID09IDM3ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDU2Vjb25kcygpID09IDYgJiYgaXNFeHRlbmRlZC5nZXRVVENNaWxsaXNlY29uZHMoKSA9PSA3MDg7XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuXG4gICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgd2hldGhlciB0aGUgbmF0aXZlIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBwYXJzZWBcbiAgICAvLyBpbXBsZW1lbnRhdGlvbnMgYXJlIHNwZWMtY29tcGxpYW50LiBCYXNlZCBvbiB3b3JrIGJ5IEtlbiBTbnlkZXIuXG4gICAgZnVuY3Rpb24gaGFzKG5hbWUpIHtcbiAgICAgIGlmIChoYXNbbmFtZV0gIT09IHVuZGVmKSB7XG4gICAgICAgIC8vIFJldHVybiBjYWNoZWQgZmVhdHVyZSB0ZXN0IHJlc3VsdC5cbiAgICAgICAgcmV0dXJuIGhhc1tuYW1lXTtcbiAgICAgIH1cbiAgICAgIHZhciBpc1N1cHBvcnRlZDtcbiAgICAgIGlmIChuYW1lID09IFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpIHtcbiAgICAgICAgLy8gSUUgPD0gNyBkb2Vzbid0IHN1cHBvcnQgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIHVzaW5nIHNxdWFyZVxuICAgICAgICAvLyBicmFja2V0IG5vdGF0aW9uLiBJRSA4IG9ubHkgc3VwcG9ydHMgdGhpcyBmb3IgcHJpbWl0aXZlcy5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBcImFcIlswXSAhPSBcImFcIjtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PSBcImpzb25cIikge1xuICAgICAgICAvLyBJbmRpY2F0ZXMgd2hldGhlciBib3RoIGBKU09OLnN0cmluZ2lmeWAgYW5kIGBKU09OLnBhcnNlYCBhcmVcbiAgICAgICAgLy8gc3VwcG9ydGVkLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IGhhcyhcImpzb24tc3RyaW5naWZ5XCIpICYmIGhhcyhcImpzb24tcGFyc2VcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdmFsdWUsIHNlcmlhbGl6ZWQgPSAne1wiYVwiOlsxLHRydWUsZmFsc2UsbnVsbCxcIlxcXFx1MDAwMFxcXFxiXFxcXG5cXFxcZlxcXFxyXFxcXHRcIl19JztcbiAgICAgICAgLy8gVGVzdCBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tc3RyaW5naWZ5XCIpIHtcbiAgICAgICAgICB2YXIgc3RyaW5naWZ5ID0gZXhwb3J0cy5zdHJpbmdpZnksIHN0cmluZ2lmeVN1cHBvcnRlZCA9IHR5cGVvZiBzdHJpbmdpZnkgPT0gXCJmdW5jdGlvblwiICYmIGlzRXh0ZW5kZWQ7XG4gICAgICAgICAgaWYgKHN0cmluZ2lmeVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgLy8gQSB0ZXN0IGZ1bmN0aW9uIG9iamVjdCB3aXRoIGEgY3VzdG9tIGB0b0pTT05gIG1ldGhvZC5cbiAgICAgICAgICAgICh2YWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9KS50b0pTT04gPSB2YWx1ZTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN0cmluZ2lmeVN1cHBvcnRlZCA9XG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCAzLjFiMSBhbmQgYjIgc2VyaWFsaXplIHN0cmluZywgbnVtYmVyLCBhbmQgYm9vbGVhblxuICAgICAgICAgICAgICAgIC8vIHByaW1pdGl2ZXMgYXMgb2JqZWN0IGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgwKSA9PT0gXCIwXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIsIGFuZCBKU09OIDIgc2VyaWFsaXplIHdyYXBwZWQgcHJpbWl0aXZlcyBhcyBvYmplY3RcbiAgICAgICAgICAgICAgICAvLyBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IE51bWJlcigpKSA9PT0gXCIwXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IFN0cmluZygpKSA9PSAnXCJcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgdmFsdWUgaXMgYG51bGxgLCBgdW5kZWZpbmVkYCwgb3JcbiAgICAgICAgICAgICAgICAvLyBkb2VzIG5vdCBkZWZpbmUgYSBjYW5vbmljYWwgSlNPTiByZXByZXNlbnRhdGlvbiAodGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGB0b0pTT05gIHByb3BlcnRpZXMgYXMgd2VsbCwgKnVubGVzcyogdGhleSBhcmUgbmVzdGVkXG4gICAgICAgICAgICAgICAgLy8gd2l0aGluIGFuIG9iamVjdCBvciBhcnJheSkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KGdldENsYXNzKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBJRSA4IHNlcmlhbGl6ZXMgYHVuZGVmaW5lZGAgYXMgYFwidW5kZWZpbmVkXCJgLiBTYWZhcmkgPD0gNS4xLjcgYW5kXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjMgcGFzcyB0aGlzIHRlc3QuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHVuZGVmKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjcgYW5kIEZGIDMuMWIzIHRocm93IGBFcnJvcmBzIGFuZCBgVHlwZUVycm9yYHMsXG4gICAgICAgICAgICAgICAgLy8gcmVzcGVjdGl2ZWx5LCBpZiB0aGUgdmFsdWUgaXMgb21pdHRlZCBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoKSA9PT0gdW5kZWYgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiB0aHJvdyBhbiBlcnJvciBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgbm90IGEgbnVtYmVyLFxuICAgICAgICAgICAgICAgIC8vIHN0cmluZywgYXJyYXksIG9iamVjdCwgQm9vbGVhbiwgb3IgYG51bGxgIGxpdGVyYWwuIFRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBjdXN0b20gYHRvSlNPTmAgbWV0aG9kcyBhcyB3ZWxsLCB1bmxlc3MgdGhleSBhcmUgbmVzdGVkXG4gICAgICAgICAgICAgICAgLy8gaW5zaWRlIG9iamVjdCBvciBhcnJheSBsaXRlcmFscy4gWVVJIDMuMC4wYjEgaWdub3JlcyBjdXN0b20gYHRvSlNPTmBcbiAgICAgICAgICAgICAgICAvLyBtZXRob2RzIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh2YWx1ZSkgPT09IFwiMVwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt2YWx1ZV0pID09IFwiWzFdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgc2VyaWFsaXplcyBgW3VuZGVmaW5lZF1gIGFzIGBcIltdXCJgIGluc3RlYWQgb2ZcbiAgICAgICAgICAgICAgICAvLyBgXCJbbnVsbF1cImAuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZl0pID09IFwiW251bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBZVUkgMy4wLjBiMSBmYWlscyB0byBzZXJpYWxpemUgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShudWxsKSA9PSBcIm51bGxcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIGhhbHRzIHNlcmlhbGl6YXRpb24gaWYgYW4gYXJyYXkgY29udGFpbnMgYSBmdW5jdGlvbjpcbiAgICAgICAgICAgICAgICAvLyBgWzEsIHRydWUsIGdldENsYXNzLCAxXWAgc2VyaWFsaXplcyBhcyBcIlsxLHRydWUsXSxcIi4gRkYgMy4xYjNcbiAgICAgICAgICAgICAgICAvLyBlbGlkZXMgbm9uLUpTT04gdmFsdWVzIGZyb20gb2JqZWN0cyBhbmQgYXJyYXlzLCB1bmxlc3MgdGhleVxuICAgICAgICAgICAgICAgIC8vIGRlZmluZSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kcy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmLCBnZXRDbGFzcywgbnVsbF0pID09IFwiW251bGwsbnVsbCxudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHNlcmlhbGl6YXRpb24gdGVzdC4gRkYgMy4xYjEgdXNlcyBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZXNcbiAgICAgICAgICAgICAgICAvLyB3aGVyZSBjaGFyYWN0ZXIgZXNjYXBlIGNvZGVzIGFyZSBleHBlY3RlZCAoZS5nLiwgYFxcYmAgPT4gYFxcdTAwMDhgKS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoeyBcImFcIjogW3ZhbHVlLCB0cnVlLCBmYWxzZSwgbnVsbCwgXCJcXHgwMFxcYlxcblxcZlxcclxcdFwiXSB9KSA9PSBzZXJpYWxpemVkICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEgYW5kIGIyIGlnbm9yZSB0aGUgYGZpbHRlcmAgYW5kIGB3aWR0aGAgYXJndW1lbnRzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShudWxsLCB2YWx1ZSkgPT09IFwiMVwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFsxLCAyXSwgbnVsbCwgMSkgPT0gXCJbXFxuIDEsXFxuIDJcXG5dXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBKU09OIDIsIFByb3RvdHlwZSA8PSAxLjcsIGFuZCBvbGRlciBXZWJLaXQgYnVpbGRzIGluY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgLy8gc2VyaWFsaXplIGV4dGVuZGVkIHllYXJzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtOC42NGUxNSkpID09ICdcIi0yNzE4MjEtMDQtMjBUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFRoZSBtaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUsIGJ1dCByZXF1aXJlZCBpbiA1LjEuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKDguNjRlMTUpKSA9PSAnXCIrMjc1NzYwLTA5LTEzVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDw9IDExLjAgaW5jb3JyZWN0bHkgc2VyaWFsaXplcyB5ZWFycyBwcmlvciB0byAwIGFzIG5lZ2F0aXZlXG4gICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCB5ZWFycyBpbnN0ZWFkIG9mIHNpeC1kaWdpdCB5ZWFycy4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTYyMTk4NzU1MmU1KSkgPT0gJ1wiLTAwMDAwMS0wMS0wMVQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS41IGFuZCBPcGVyYSA+PSAxMC41MyBpbmNvcnJlY3RseSBzZXJpYWxpemUgbWlsbGlzZWNvbmRcbiAgICAgICAgICAgICAgICAvLyB2YWx1ZXMgbGVzcyB0aGFuIDEwMDAuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC0xKSkgPT0gJ1wiMTk2OS0xMi0zMVQyMzo1OTo1OS45OTlaXCInO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHN0cmluZ2lmeVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHN0cmluZ2lmeVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgICAvLyBUZXN0IGBKU09OLnBhcnNlYC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXBhcnNlXCIpIHtcbiAgICAgICAgICB2YXIgcGFyc2UgPSBleHBvcnRzLnBhcnNlO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyc2UgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgYjIgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYSBiYXJlIGxpdGVyYWwgaXMgcHJvdmlkZWQuXG4gICAgICAgICAgICAgIC8vIENvbmZvcm1pbmcgaW1wbGVtZW50YXRpb25zIHNob3VsZCBhbHNvIGNvZXJjZSB0aGUgaW5pdGlhbCBhcmd1bWVudCB0b1xuICAgICAgICAgICAgICAvLyBhIHN0cmluZyBwcmlvciB0byBwYXJzaW5nLlxuICAgICAgICAgICAgICBpZiAocGFyc2UoXCIwXCIpID09PSAwICYmICFwYXJzZShmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgcGFyc2luZyB0ZXN0LlxuICAgICAgICAgICAgICAgIHZhbHVlID0gcGFyc2Uoc2VyaWFsaXplZCk7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnNlU3VwcG9ydGVkID0gdmFsdWVbXCJhXCJdLmxlbmd0aCA9PSA1ICYmIHZhbHVlW1wiYVwiXVswXSA9PT0gMTtcbiAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuMiBhbmQgRkYgMy4xYjEgYWxsb3cgdW5lc2NhcGVkIHRhYnMgaW4gc3RyaW5ncy5cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSAhcGFyc2UoJ1wiXFx0XCInKTtcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCBhbmQgNC4wLjEgYWxsb3cgbGVhZGluZyBgK2Agc2lnbnMgYW5kIGxlYWRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIHBvaW50cy4gRkYgNC4wLCA0LjAuMSwgYW5kIElFIDktMTAgYWxzbyBhbGxvd1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGNlcnRhaW4gb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjAxXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAsIDQuMC4xLCBhbmQgUmhpbm8gMS43UjMtUjQgYWxsb3cgdHJhaWxpbmcgZGVjaW1hbFxuICAgICAgICAgICAgICAgICAgICAgIC8vIHBvaW50cy4gVGhlc2UgZW52aXJvbm1lbnRzLCBhbG9uZyB3aXRoIEZGIDMuMWIxIGFuZCAyLFxuICAgICAgICAgICAgICAgICAgICAgIC8vIGFsc28gYWxsb3cgdHJhaWxpbmcgY29tbWFzIGluIEpTT04gb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIxLlwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gcGFyc2VTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNbbmFtZV0gPSAhIWlzU3VwcG9ydGVkO1xuICAgIH1cblxuICAgIGlmICh0cnVlKSB7IC8vIHVzZWQgdG8gYmUgIWhhcyhcImpzb25cIilcbiAgICAgIC8vIENvbW1vbiBgW1tDbGFzc11dYCBuYW1lIGFsaWFzZXMuXG4gICAgICB2YXIgZnVuY3Rpb25DbGFzcyA9IFwiW29iamVjdCBGdW5jdGlvbl1cIixcbiAgICAgICAgICBkYXRlQ2xhc3MgPSBcIltvYmplY3QgRGF0ZV1cIixcbiAgICAgICAgICBudW1iZXJDbGFzcyA9IFwiW29iamVjdCBOdW1iZXJdXCIsXG4gICAgICAgICAgc3RyaW5nQ2xhc3MgPSBcIltvYmplY3QgU3RyaW5nXVwiLFxuICAgICAgICAgIGFycmF5Q2xhc3MgPSBcIltvYmplY3QgQXJyYXldXCIsXG4gICAgICAgICAgYm9vbGVhbkNsYXNzID0gXCJbb2JqZWN0IEJvb2xlYW5dXCI7XG5cbiAgICAgIC8vIERldGVjdCBpbmNvbXBsZXRlIHN1cHBvcnQgZm9yIGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyBieSBpbmRleC5cbiAgICAgIHZhciBjaGFySW5kZXhCdWdneSA9IGhhcyhcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKTtcblxuICAgICAgLy8gRGVmaW5lIGFkZGl0aW9uYWwgdXRpbGl0eSBtZXRob2RzIGlmIHRoZSBgRGF0ZWAgbWV0aG9kcyBhcmUgYnVnZ3kuXG4gICAgICBpZiAoIWlzRXh0ZW5kZWQpIHtcbiAgICAgICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICAgICAgLy8gQSBtYXBwaW5nIGJldHdlZW4gdGhlIG1vbnRocyBvZiB0aGUgeWVhciBhbmQgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW5cbiAgICAgICAgLy8gSmFudWFyeSAxc3QgYW5kIHRoZSBmaXJzdCBvZiB0aGUgcmVzcGVjdGl2ZSBtb250aC5cbiAgICAgICAgdmFyIE1vbnRocyA9IFswLCAzMSwgNTksIDkwLCAxMjAsIDE1MSwgMTgxLCAyMTIsIDI0MywgMjczLCAzMDQsIDMzNF07XG4gICAgICAgIC8vIEludGVybmFsOiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRoZSBVbml4IGVwb2NoIGFuZCB0aGVcbiAgICAgICAgLy8gZmlyc3QgZGF5IG9mIHRoZSBnaXZlbiBtb250aC5cbiAgICAgICAgdmFyIGdldERheSA9IGZ1bmN0aW9uICh5ZWFyLCBtb250aCkge1xuICAgICAgICAgIHJldHVybiBNb250aHNbbW9udGhdICsgMzY1ICogKHllYXIgLSAxOTcwKSArIGZsb29yKCh5ZWFyIC0gMTk2OSArIChtb250aCA9ICsobW9udGggPiAxKSkpIC8gNCkgLSBmbG9vcigoeWVhciAtIDE5MDEgKyBtb250aCkgLyAxMDApICsgZmxvb3IoKHllYXIgLSAxNjAxICsgbW9udGgpIC8gNDAwKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgaWYgYSBwcm9wZXJ0eSBpcyBhIGRpcmVjdCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW5cbiAgICAgIC8vIG9iamVjdC4gRGVsZWdhdGVzIHRvIHRoZSBuYXRpdmUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgbWV0aG9kLlxuICAgICAgaWYgKCEoaXNQcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5KSkge1xuICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgY29uc3RydWN0b3I7XG4gICAgICAgICAgaWYgKChtZW1iZXJzLl9fcHJvdG9fXyA9IG51bGwsIG1lbWJlcnMuX19wcm90b19fID0ge1xuICAgICAgICAgICAgLy8gVGhlICpwcm90byogcHJvcGVydHkgY2Fubm90IGJlIHNldCBtdWx0aXBsZSB0aW1lcyBpbiByZWNlbnRcbiAgICAgICAgICAgIC8vIHZlcnNpb25zIG9mIEZpcmVmb3ggYW5kIFNlYU1vbmtleS5cbiAgICAgICAgICAgIFwidG9TdHJpbmdcIjogMVxuICAgICAgICAgIH0sIG1lbWJlcnMpLnRvU3RyaW5nICE9IGdldENsYXNzKSB7XG4gICAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjMgZG9lc24ndCBpbXBsZW1lbnQgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAsIGJ1dFxuICAgICAgICAgICAgLy8gc3VwcG9ydHMgdGhlIG11dGFibGUgKnByb3RvKiBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgLy8gQ2FwdHVyZSBhbmQgYnJlYWsgdGhlIG9iamVjdCdzIHByb3RvdHlwZSBjaGFpbiAoc2VlIHNlY3Rpb24gOC42LjJcbiAgICAgICAgICAgICAgLy8gb2YgdGhlIEVTIDUuMSBzcGVjKS4gVGhlIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbiBwcmV2ZW50cyBhblxuICAgICAgICAgICAgICAvLyB1bnNhZmUgdHJhbnNmb3JtYXRpb24gYnkgdGhlIENsb3N1cmUgQ29tcGlsZXIuXG4gICAgICAgICAgICAgIHZhciBvcmlnaW5hbCA9IHRoaXMuX19wcm90b19fLCByZXN1bHQgPSBwcm9wZXJ0eSBpbiAodGhpcy5fX3Byb3RvX18gPSBudWxsLCB0aGlzKTtcbiAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcHJvdG90eXBlIGNoYWluLlxuICAgICAgICAgICAgICB0aGlzLl9fcHJvdG9fXyA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2FwdHVyZSBhIHJlZmVyZW5jZSB0byB0aGUgdG9wLWxldmVsIGBPYmplY3RgIGNvbnN0cnVjdG9yLlxuICAgICAgICAgICAgY29uc3RydWN0b3IgPSBtZW1iZXJzLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IHRvIHNpbXVsYXRlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGluXG4gICAgICAgICAgICAvLyBvdGhlciBlbnZpcm9ubWVudHMuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIHZhciBwYXJlbnQgPSAodGhpcy5jb25zdHJ1Y3RvciB8fCBjb25zdHJ1Y3RvcikucHJvdG90eXBlO1xuICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkgaW4gdGhpcyAmJiAhKHByb3BlcnR5IGluIHBhcmVudCAmJiB0aGlzW3Byb3BlcnR5XSA9PT0gcGFyZW50W3Byb3BlcnR5XSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBtZW1iZXJzID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gaXNQcm9wZXJ0eS5jYWxsKHRoaXMsIHByb3BlcnR5KTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IE5vcm1hbGl6ZXMgdGhlIGBmb3IuLi5pbmAgaXRlcmF0aW9uIGFsZ29yaXRobSBhY3Jvc3NcbiAgICAgIC8vIGVudmlyb25tZW50cy4gRWFjaCBlbnVtZXJhdGVkIGtleSBpcyB5aWVsZGVkIHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi5cbiAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2l6ZSA9IDAsIFByb3BlcnRpZXMsIG1lbWJlcnMsIHByb3BlcnR5O1xuXG4gICAgICAgIC8vIFRlc3RzIGZvciBidWdzIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50J3MgYGZvci4uLmluYCBhbGdvcml0aG0uIFRoZVxuICAgICAgICAvLyBgdmFsdWVPZmAgcHJvcGVydHkgaW5oZXJpdHMgdGhlIG5vbi1lbnVtZXJhYmxlIGZsYWcgZnJvbVxuICAgICAgICAvLyBgT2JqZWN0LnByb3RvdHlwZWAgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUsIE5ldHNjYXBlLCBhbmQgTW96aWxsYS5cbiAgICAgICAgKFByb3BlcnRpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy52YWx1ZU9mID0gMDtcbiAgICAgICAgfSkucHJvdG90eXBlLnZhbHVlT2YgPSAwO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgYFByb3BlcnRpZXNgIGNsYXNzLlxuICAgICAgICBtZW1iZXJzID0gbmV3IFByb3BlcnRpZXMoKTtcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBtZW1iZXJzKSB7XG4gICAgICAgICAgLy8gSWdub3JlIGFsbCBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBpZiAoaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBQcm9wZXJ0aWVzID0gbWVtYmVycyA9IG51bGw7XG5cbiAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBpdGVyYXRpb24gYWxnb3JpdGhtLlxuICAgICAgICBpZiAoIXNpemUpIHtcbiAgICAgICAgICAvLyBBIGxpc3Qgb2Ygbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgbWVtYmVycyA9IFtcInZhbHVlT2ZcIiwgXCJ0b1N0cmluZ1wiLCBcInRvTG9jYWxlU3RyaW5nXCIsIFwicHJvcGVydHlJc0VudW1lcmFibGVcIiwgXCJpc1Byb3RvdHlwZU9mXCIsIFwiaGFzT3duUHJvcGVydHlcIiwgXCJjb25zdHJ1Y3RvclwiXTtcbiAgICAgICAgICAvLyBJRSA8PSA4LCBNb3ppbGxhIDEuMCwgYW5kIE5ldHNjYXBlIDYuMiBpZ25vcmUgc2hhZG93ZWQgbm9uLWVudW1lcmFibGVcbiAgICAgICAgICAvLyBwcm9wZXJ0aWVzLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGxlbmd0aDtcbiAgICAgICAgICAgIHZhciBoYXNQcm9wZXJ0eSA9ICFpc0Z1bmN0aW9uICYmIHR5cGVvZiBvYmplY3QuY29uc3RydWN0b3IgIT0gXCJmdW5jdGlvblwiICYmIG9iamVjdFR5cGVzW3R5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHldICYmIG9iamVjdC5oYXNPd25Qcm9wZXJ0eSB8fCBpc1Byb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gR2Vja28gPD0gMS4wIGVudW1lcmF0ZXMgdGhlIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyB1bmRlclxuICAgICAgICAgICAgICAvLyBjZXJ0YWluIGNvbmRpdGlvbnM7IElFIGRvZXMgbm90LlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIGVhY2ggbm9uLWVudW1lcmFibGUgcHJvcGVydHkuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IG1lbWJlcnMubGVuZ3RoOyBwcm9wZXJ0eSA9IG1lbWJlcnNbLS1sZW5ndGhdOyBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmIGNhbGxiYWNrKHByb3BlcnR5KSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChzaXplID09IDIpIHtcbiAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjQgZW51bWVyYXRlcyBzaGFkb3dlZCBwcm9wZXJ0aWVzIHR3aWNlLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2V0IG9mIGl0ZXJhdGVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gU3RvcmUgZWFjaCBwcm9wZXJ0eSBuYW1lIHRvIHByZXZlbnQgZG91YmxlIGVudW1lcmF0aW9uLiBUaGVcbiAgICAgICAgICAgICAgLy8gYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIGlzIG5vdCBlbnVtZXJhdGVkIGR1ZSB0byBjcm9zcy1cbiAgICAgICAgICAgICAgLy8gZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmICFpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpICYmIChtZW1iZXJzW3Byb3BlcnR5XSA9IDEpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gYnVncyBkZXRlY3RlZDsgdXNlIHRoZSBzdGFuZGFyZCBgZm9yLi4uaW5gIGFsZ29yaXRobS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBpc0NvbnN0cnVjdG9yO1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgIShpc0NvbnN0cnVjdG9yID0gcHJvcGVydHkgPT09IFwiY29uc3RydWN0b3JcIikpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IGR1ZSB0b1xuICAgICAgICAgICAgLy8gY3Jvc3MtZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IgfHwgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgKHByb3BlcnR5ID0gXCJjb25zdHJ1Y3RvclwiKSkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvckVhY2gob2JqZWN0LCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAvLyBQdWJsaWM6IFNlcmlhbGl6ZXMgYSBKYXZhU2NyaXB0IGB2YWx1ZWAgYXMgYSBKU09OIHN0cmluZy4gVGhlIG9wdGlvbmFsXG4gICAgICAvLyBgZmlsdGVyYCBhcmd1bWVudCBtYXkgc3BlY2lmeSBlaXRoZXIgYSBmdW5jdGlvbiB0aGF0IGFsdGVycyBob3cgb2JqZWN0IGFuZFxuICAgICAgLy8gYXJyYXkgbWVtYmVycyBhcmUgc2VyaWFsaXplZCwgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncyBhbmQgbnVtYmVycyB0aGF0XG4gICAgICAvLyBpbmRpY2F0ZXMgd2hpY2ggcHJvcGVydGllcyBzaG91bGQgYmUgc2VyaWFsaXplZC4gVGhlIG9wdGlvbmFsIGB3aWR0aGBcbiAgICAgIC8vIGFyZ3VtZW50IG1heSBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgbnVtYmVyIHRoYXQgc3BlY2lmaWVzIHRoZSBpbmRlbnRhdGlvblxuICAgICAgLy8gbGV2ZWwgb2YgdGhlIG91dHB1dC5cbiAgICAgIGlmICh0cnVlKSB7XG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuXG4gICAgICAgIHZhciBFc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcXFxcXCInLFxuICAgICAgICAgIDg6IFwiXFxcXGJcIixcbiAgICAgICAgICAxMjogXCJcXFxcZlwiLFxuICAgICAgICAgIDEwOiBcIlxcXFxuXCIsXG4gICAgICAgICAgMTM6IFwiXFxcXHJcIixcbiAgICAgICAgICA5OiBcIlxcXFx0XCJcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQ29udmVydHMgYHZhbHVlYCBpbnRvIGEgemVyby1wYWRkZWQgc3RyaW5nIHN1Y2ggdGhhdCBpdHNcbiAgICAgICAgLy8gbGVuZ3RoIGlzIGF0IGxlYXN0IGVxdWFsIHRvIGB3aWR0aGAuIFRoZSBgd2lkdGhgIG11c3QgYmUgPD0gNi5cbiAgICAgICAgdmFyIGxlYWRpbmdaZXJvZXMgPSBcIjAwMDAwMFwiO1xuICAgICAgICB2YXIgdG9QYWRkZWRTdHJpbmcgPSBmdW5jdGlvbiAod2lkdGgsIHZhbHVlKSB7XG4gICAgICAgICAgLy8gVGhlIGB8fCAwYCBleHByZXNzaW9uIGlzIG5lY2Vzc2FyeSB0byB3b3JrIGFyb3VuZCBhIGJ1ZyBpblxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiB3aGVyZSBgMCA9PSAtMGAsIGJ1dCBgU3RyaW5nKC0wKSAhPT0gXCIwXCJgLlxuICAgICAgICAgIHJldHVybiAobGVhZGluZ1plcm9lcyArICh2YWx1ZSB8fCAwKSkuc2xpY2UoLXdpZHRoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogRG91YmxlLXF1b3RlcyBhIHN0cmluZyBgdmFsdWVgLCByZXBsYWNpbmcgYWxsIEFTQ0lJIGNvbnRyb2xcbiAgICAgICAgLy8gY2hhcmFjdGVycyAoY2hhcmFjdGVycyB3aXRoIGNvZGUgdW5pdCB2YWx1ZXMgYmV0d2VlbiAwIGFuZCAzMSkgd2l0aFxuICAgICAgICAvLyB0aGVpciBlc2NhcGVkIGVxdWl2YWxlbnRzLiBUaGlzIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZVxuICAgICAgICAvLyBgUXVvdGUodmFsdWUpYCBvcGVyYXRpb24gZGVmaW5lZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuICAgICAgICB2YXIgdW5pY29kZVByZWZpeCA9IFwiXFxcXHUwMFwiO1xuICAgICAgICB2YXIgcXVvdGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gJ1wiJywgaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGgsIHVzZUNoYXJJbmRleCA9ICFjaGFySW5kZXhCdWdneSB8fCBsZW5ndGggPiAxMDtcbiAgICAgICAgICB2YXIgc3ltYm9scyA9IHVzZUNoYXJJbmRleCAmJiAoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5zcGxpdChcIlwiKSA6IHZhbHVlKTtcbiAgICAgICAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgIHZhciBjaGFyQ29kZSA9IHZhbHVlLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgICAgICAgICAgLy8gSWYgdGhlIGNoYXJhY3RlciBpcyBhIGNvbnRyb2wgY2hhcmFjdGVyLCBhcHBlbmQgaXRzIFVuaWNvZGUgb3JcbiAgICAgICAgICAgIC8vIHNob3J0aGFuZCBlc2NhcGUgc2VxdWVuY2U7IG90aGVyd2lzZSwgYXBwZW5kIHRoZSBjaGFyYWN0ZXIgYXMtaXMuXG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgODogY2FzZSA5OiBjYXNlIDEwOiBjYXNlIDEyOiBjYXNlIDEzOiBjYXNlIDM0OiBjYXNlIDkyOlxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBFc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPCAzMikge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVuaWNvZGVQcmVmaXggKyB0b1BhZGRlZFN0cmluZygyLCBjaGFyQ29kZS50b1N0cmluZygxNikpO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSB1c2VDaGFySW5kZXggPyBzeW1ib2xzW2luZGV4XSA6IHZhbHVlLmNoYXJBdChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQgKyAnXCInO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBSZWN1cnNpdmVseSBzZXJpYWxpemVzIGFuIG9iamVjdC4gSW1wbGVtZW50cyB0aGVcbiAgICAgICAgLy8gYFN0cihrZXksIGhvbGRlcilgLCBgSk8odmFsdWUpYCwgYW5kIGBKQSh2YWx1ZSlgIG9wZXJhdGlvbnMuXG4gICAgICAgIHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbiAocHJvcGVydHksIG9iamVjdCwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLCBzdGFjaywgbWF4TGluZUxlbmd0aCkge1xuICAgICAgICAgIHZhciB2YWx1ZSwgY2xhc3NOYW1lLCB5ZWFyLCBtb250aCwgZGF0ZSwgdGltZSwgaG91cnMsIG1pbnV0ZXMsIHNlY29uZHMsIG1pbGxpc2Vjb25kcywgcmVzdWx0cywgZWxlbWVudCwgaW5kZXgsIGxlbmd0aCwgcHJlZml4LCByZXN1bHQ7XG5cbiAgICAgICAgICBtYXhMaW5lTGVuZ3RoID0gbWF4TGluZUxlbmd0aCB8fCAwO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIE5lY2Vzc2FyeSBmb3IgaG9zdCBvYmplY3Qgc3VwcG9ydC5cbiAgICAgICAgICAgIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gZGF0ZUNsYXNzICYmICFpc1Byb3BlcnR5LmNhbGwodmFsdWUsIFwidG9KU09OXCIpKSB7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwKSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0ZXMgYXJlIHNlcmlhbGl6ZWQgYWNjb3JkaW5nIHRvIHRoZSBgRGF0ZSN0b0pTT05gIG1ldGhvZFxuICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZCBpbiBFUyA1LjEgc2VjdGlvbiAxNS45LjUuNDQuIFNlZSBzZWN0aW9uIDE1LjkuMS4xNVxuICAgICAgICAgICAgICAgIC8vIGZvciB0aGUgSVNPIDg2MDEgZGF0ZSB0aW1lIHN0cmluZyBmb3JtYXQuXG4gICAgICAgICAgICAgICAgaWYgKGdldERheSkge1xuICAgICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29tcHV0ZSB0aGUgeWVhciwgbW9udGgsIGRhdGUsIGhvdXJzLCBtaW51dGVzLFxuICAgICAgICAgICAgICAgICAgLy8gc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBpZiB0aGUgYGdldFVUQypgIG1ldGhvZHMgYXJlXG4gICAgICAgICAgICAgICAgICAvLyBidWdneS4gQWRhcHRlZCBmcm9tIEBZYWZmbGUncyBgZGF0ZS1zaGltYCBwcm9qZWN0LlxuICAgICAgICAgICAgICAgICAgZGF0ZSA9IGZsb29yKHZhbHVlIC8gODY0ZTUpO1xuICAgICAgICAgICAgICAgICAgZm9yICh5ZWFyID0gZmxvb3IoZGF0ZSAvIDM2NS4yNDI1KSArIDE5NzAgLSAxOyBnZXREYXkoeWVhciArIDEsIDApIDw9IGRhdGU7IHllYXIrKyk7XG4gICAgICAgICAgICAgICAgICBmb3IgKG1vbnRoID0gZmxvb3IoKGRhdGUgLSBnZXREYXkoeWVhciwgMCkpIC8gMzAuNDIpOyBnZXREYXkoeWVhciwgbW9udGggKyAxKSA8PSBkYXRlOyBtb250aCsrKTtcbiAgICAgICAgICAgICAgICAgIGRhdGUgPSAxICsgZGF0ZSAtIGdldERheSh5ZWFyLCBtb250aCk7XG4gICAgICAgICAgICAgICAgICAvLyBUaGUgYHRpbWVgIHZhbHVlIHNwZWNpZmllcyB0aGUgdGltZSB3aXRoaW4gdGhlIGRheSAoc2VlIEVTXG4gICAgICAgICAgICAgICAgICAvLyA1LjEgc2VjdGlvbiAxNS45LjEuMikuIFRoZSBmb3JtdWxhIGAoQSAlIEIgKyBCKSAlIEJgIGlzIHVzZWRcbiAgICAgICAgICAgICAgICAgIC8vIHRvIGNvbXB1dGUgYEEgbW9kdWxvIEJgLCBhcyB0aGUgYCVgIG9wZXJhdG9yIGRvZXMgbm90XG4gICAgICAgICAgICAgICAgICAvLyBjb3JyZXNwb25kIHRvIHRoZSBgbW9kdWxvYCBvcGVyYXRpb24gZm9yIG5lZ2F0aXZlIG51bWJlcnMuXG4gICAgICAgICAgICAgICAgICB0aW1lID0gKHZhbHVlICUgODY0ZTUgKyA4NjRlNSkgJSA4NjRlNTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBob3VycywgbWludXRlcywgc2Vjb25kcywgYW5kIG1pbGxpc2Vjb25kcyBhcmUgb2J0YWluZWQgYnlcbiAgICAgICAgICAgICAgICAgIC8vIGRlY29tcG9zaW5nIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5LiBTZWUgc2VjdGlvbiAxNS45LjEuMTAuXG4gICAgICAgICAgICAgICAgICBob3VycyA9IGZsb29yKHRpbWUgLyAzNmU1KSAlIDI0O1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IGZsb29yKHRpbWUgLyA2ZTQpICUgNjA7XG4gICAgICAgICAgICAgICAgICBzZWNvbmRzID0gZmxvb3IodGltZSAvIDFlMykgJSA2MDtcbiAgICAgICAgICAgICAgICAgIG1pbGxpc2Vjb25kcyA9IHRpbWUgJSAxZTM7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHllYXIgPSB2YWx1ZS5nZXRVVENGdWxsWWVhcigpO1xuICAgICAgICAgICAgICAgICAgbW9udGggPSB2YWx1ZS5nZXRVVENNb250aCgpO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IHZhbHVlLmdldFVUQ0RhdGUoKTtcbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gdmFsdWUuZ2V0VVRDSG91cnMoKTtcbiAgICAgICAgICAgICAgICAgIG1pbnV0ZXMgPSB2YWx1ZS5nZXRVVENNaW51dGVzKCk7XG4gICAgICAgICAgICAgICAgICBzZWNvbmRzID0gdmFsdWUuZ2V0VVRDU2Vjb25kcygpO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdmFsdWUuZ2V0VVRDTWlsbGlzZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycyBjb3JyZWN0bHkuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSAoeWVhciA8PSAwIHx8IHllYXIgPj0gMWU0ID8gKHllYXIgPCAwID8gXCItXCIgOiBcIitcIikgKyB0b1BhZGRlZFN0cmluZyg2LCB5ZWFyIDwgMCA/IC15ZWFyIDogeWVhcikgOiB0b1BhZGRlZFN0cmluZyg0LCB5ZWFyKSkgK1xuICAgICAgICAgICAgICAgICAgXCItXCIgKyB0b1BhZGRlZFN0cmluZygyLCBtb250aCArIDEpICsgXCItXCIgKyB0b1BhZGRlZFN0cmluZygyLCBkYXRlKSArXG4gICAgICAgICAgICAgICAgICAvLyBNb250aHMsIGRhdGVzLCBob3VycywgbWludXRlcywgYW5kIHNlY29uZHMgc2hvdWxkIGhhdmUgdHdvXG4gICAgICAgICAgICAgICAgICAvLyBkaWdpdHM7IG1pbGxpc2Vjb25kcyBzaG91bGQgaGF2ZSB0aHJlZS5cbiAgICAgICAgICAgICAgICAgIFwiVFwiICsgdG9QYWRkZWRTdHJpbmcoMiwgaG91cnMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBtaW51dGVzKSArIFwiOlwiICsgdG9QYWRkZWRTdHJpbmcoMiwgc2Vjb25kcykgK1xuICAgICAgICAgICAgICAgICAgLy8gTWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LjAsIGJ1dCByZXF1aXJlZCBpbiA1LjEuXG4gICAgICAgICAgICAgICAgICBcIi5cIiArIHRvUGFkZGVkU3RyaW5nKDMsIG1pbGxpc2Vjb25kcykgKyBcIlpcIjtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlLnRvSlNPTiA9PSBcImZ1bmN0aW9uXCIgJiYgKChjbGFzc05hbWUgIT0gbnVtYmVyQ2xhc3MgJiYgY2xhc3NOYW1lICE9IHN0cmluZ0NsYXNzICYmIGNsYXNzTmFtZSAhPSBhcnJheUNsYXNzKSB8fCBpc1Byb3BlcnR5LmNhbGwodmFsdWUsIFwidG9KU09OXCIpKSkge1xuICAgICAgICAgICAgICAvLyBQcm90b3R5cGUgPD0gMS42LjEgYWRkcyBub24tc3RhbmRhcmQgYHRvSlNPTmAgbWV0aG9kcyB0byB0aGVcbiAgICAgICAgICAgICAgLy8gYE51bWJlcmAsIGBTdHJpbmdgLCBgRGF0ZWAsIGFuZCBgQXJyYXlgIHByb3RvdHlwZXMuIEpTT04gM1xuICAgICAgICAgICAgICAvLyBpZ25vcmVzIGFsbCBgdG9KU09OYCBtZXRob2RzIG9uIHRoZXNlIG9iamVjdHMgdW5sZXNzIHRoZXkgYXJlXG4gICAgICAgICAgICAgIC8vIGRlZmluZWQgZGlyZWN0bHkgb24gYW4gaW5zdGFuY2UuXG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9KU09OKHByb3BlcnR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHJlcGxhY2VtZW50IGZ1bmN0aW9uIHdhcyBwcm92aWRlZCwgY2FsbCBpdCB0byBvYnRhaW4gdGhlIHZhbHVlXG4gICAgICAgICAgICAvLyBmb3Igc2VyaWFsaXphdGlvbi5cbiAgICAgICAgICAgIHZhbHVlID0gY2FsbGJhY2suY2FsbChvYmplY3QsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwibnVsbFwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGJvb2xlYW5DbGFzcykge1xuICAgICAgICAgICAgLy8gQm9vbGVhbnMgYXJlIHJlcHJlc2VudGVkIGxpdGVyYWxseS5cbiAgICAgICAgICAgIHJldHVybiBcIlwiICsgdmFsdWU7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIEpTT04gbnVtYmVycyBtdXN0IGJlIGZpbml0ZS4gYEluZmluaXR5YCBhbmQgYE5hTmAgYXJlIHNlcmlhbGl6ZWQgYXNcbiAgICAgICAgICAgIC8vIGBcIm51bGxcImAuXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCA/IFwiXCIgKyB2YWx1ZSA6IFwibnVsbFwiO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAvLyBTdHJpbmdzIGFyZSBkb3VibGUtcXVvdGVkIGFuZCBlc2NhcGVkLlxuICAgICAgICAgICAgcmV0dXJuIHF1b3RlKFwiXCIgKyB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoaXMgaXMgYSBsaW5lYXIgc2VhcmNoOyBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgLy8gaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mIHVuaXF1ZSBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gc3RhY2subGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgaWYgKHN0YWNrW2xlbmd0aF0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3ljbGljIHN0cnVjdHVyZXMgY2Fubm90IGJlIHNlcmlhbGl6ZWQgYnkgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWRkIHRoZSBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgICAgICAgICAgc3RhY2sucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAvLyBTYXZlIHRoZSBjdXJyZW50IGluZGVudGF0aW9uIGxldmVsIGFuZCBpbmRlbnQgb25lIGFkZGl0aW9uYWwgbGV2ZWwuXG4gICAgICAgICAgICBwcmVmaXggPSBpbmRlbnRhdGlvbjtcbiAgICAgICAgICAgIGluZGVudGF0aW9uICs9IHdoaXRlc3BhY2U7XG4gICAgICAgICAgICBpZiAoY2xhc3NOYW1lID09IGFycmF5Q2xhc3MpIHtcbiAgICAgICAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gaW5kZW50YXRpb24ubGVuZ3RoLCByZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBhcnJheSBlbGVtZW50cy5cbiAgICAgICAgICAgICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gc2VyaWFsaXplKGluZGV4LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLFxuICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGVsZW1lbnQgPT09IHVuZGVmID8gXCJudWxsXCIgOiBlbGVtZW50O1xuICAgICAgICAgICAgICAgIHRvdGFsTGVuZ3RoICs9IHJlc3VsdC5sZW5ndGggKyAoaW5kZXggPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlICYmICh0b3RhbExlbmd0aCA+IG1heExpbmVMZW5ndGgpID9cbiAgICAgICAgICAgICAgICAgIFwiW1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJdXCIgOlxuICAgICAgICAgICAgICAgICAgXCJbXCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJdXCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgOiBcIltdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIGluZGV4PTA7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3QgbWVtYmVycy4gTWVtYmVycyBhcmUgc2VsZWN0ZWQgZnJvbVxuICAgICAgICAgICAgICAvLyBlaXRoZXIgYSB1c2VyLXNwZWNpZmllZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzLCBvciB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgIC8vIGl0c2VsZi5cbiAgICAgICAgICAgICAgZm9yRWFjaChwcm9wZXJ0aWVzIHx8IHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0LCBlbGVtZW50ID0gc2VyaWFsaXplKHByb3BlcnR5LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZikge1xuICAgICAgICAgICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjM6IFwiSWYgYGdhcGAge3doaXRlc3BhY2V9XG4gICAgICAgICAgICAgICAgICAvLyBpcyBub3QgdGhlIGVtcHR5IHN0cmluZywgbGV0IGBtZW1iZXJgIHtxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIn1cbiAgICAgICAgICAgICAgICAgIC8vIGJlIHRoZSBjb25jYXRlbmF0aW9uIG9mIGBtZW1iZXJgIGFuZCB0aGUgYHNwYWNlYCBjaGFyYWN0ZXIuXCJcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBcImBzcGFjZWAgY2hhcmFjdGVyXCIgcmVmZXJzIHRvIHRoZSBsaXRlcmFsIHNwYWNlXG4gICAgICAgICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG5vdCB0aGUgYHNwYWNlYCB7d2lkdGh9IGFyZ3VtZW50IHByb3ZpZGVkIHRvXG4gICAgICAgICAgICAgICAgICAvLyBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gcXVvdGUocHJvcGVydHkpICsgXCI6XCIgKyAod2hpdGVzcGFjZSA/IFwiIFwiIDogXCJcIikgKyBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCsrID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdHMubGVuZ3RoID9cbiAgICAgICAgICAgICAgICAoXG4gICAgICAgICAgICAgICAgICB3aGl0ZXNwYWNlICYmICh0b3RhbExlbmd0aCA+IG1heExpbmVMZW5ndGgpID9cbiAgICAgICAgICAgICAgICAgIFwie1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJ9XCIgOlxuICAgICAgICAgICAgICAgICAgXCJ7XCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJ9XCJcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgOiBcInt9XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIG9iamVjdCBmcm9tIHRoZSB0cmF2ZXJzZWQgb2JqZWN0IHN0YWNrLlxuICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdWJsaWM6IGBKU09OLnN0cmluZ2lmeWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLlxuXG4gICAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgbWF4TGluZUxlbmd0aCkge1xuICAgICAgICAgIHZhciB3aGl0ZXNwYWNlLCBjYWxsYmFjaywgcHJvcGVydGllcywgY2xhc3NOYW1lO1xuICAgICAgICAgIGlmIChvYmplY3RUeXBlc1t0eXBlb2YgZmlsdGVyXSAmJiBmaWx0ZXIpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbChmaWx0ZXIpKSA9PSBmdW5jdGlvbkNsYXNzKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrID0gZmlsdGVyO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBwcm9wZXJ0eSBuYW1lcyBhcnJheSBpbnRvIGEgbWFrZXNoaWZ0IHNldC5cbiAgICAgICAgICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGZpbHRlci5sZW5ndGgsIHZhbHVlOyBpbmRleCA8IGxlbmd0aDsgdmFsdWUgPSBmaWx0ZXJbaW5kZXgrK10sICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkpLCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSAmJiAocHJvcGVydGllc1t2YWx1ZV0gPSAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh3aWR0aCkge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHdpZHRoKSkgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgYHdpZHRoYCB0byBhbiBpbnRlZ2VyIGFuZCBjcmVhdGUgYSBzdHJpbmcgY29udGFpbmluZ1xuICAgICAgICAgICAgICAvLyBgd2lkdGhgIG51bWJlciBvZiBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICBpZiAoKHdpZHRoIC09IHdpZHRoICUgMSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yICh3aGl0ZXNwYWNlID0gXCJcIiwgd2lkdGggPiAxMCAmJiAod2lkdGggPSAxMCk7IHdoaXRlc3BhY2UubGVuZ3RoIDwgd2lkdGg7IHdoaXRlc3BhY2UgKz0gXCIgXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgICB3aGl0ZXNwYWNlID0gd2lkdGgubGVuZ3RoIDw9IDEwID8gd2lkdGggOiB3aWR0aC5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiBkaXNjYXJkcyB0aGUgdmFsdWVzIGFzc29jaWF0ZWQgd2l0aCBlbXB0eSBzdHJpbmcga2V5c1xuICAgICAgICAgIC8vIChgXCJcImApIG9ubHkgaWYgdGhleSBhcmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gYW4gb2JqZWN0IG1lbWJlciBsaXN0XG4gICAgICAgICAgLy8gKGUuZy4sIGAhKFwiXCIgaW4geyBcIlwiOiAxfSlgKS5cbiAgICAgICAgICByZXR1cm4gc2VyaWFsaXplKFwiXCIsICh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHNvdXJjZSwgdmFsdWUpLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgXCJcIiwgW10sIG1heExpbmVMZW5ndGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGV4cG9ydHMuY29tcGFjdFN0cmluZ2lmeSA9IGZ1bmN0aW9uIChzb3VyY2UsIGZpbHRlciwgd2lkdGgpe1xuICAgICAgICAgIHJldHVybiBleHBvcnRzLnN0cmluZ2lmeShzb3VyY2UsIGZpbHRlciwgd2lkdGgsIDYwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBQdWJsaWM6IFBhcnNlcyBhIEpTT04gc291cmNlIHN0cmluZy5cbiAgICAgIGlmICghaGFzKFwianNvbi1wYXJzZVwiKSkge1xuICAgICAgICB2YXIgZnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIHVuZXNjYXBlZFxuICAgICAgICAvLyBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIFVuZXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcIicsXG4gICAgICAgICAgNDc6IFwiL1wiLFxuICAgICAgICAgIDk4OiBcIlxcYlwiLFxuICAgICAgICAgIDExNjogXCJcXHRcIixcbiAgICAgICAgICAxMTA6IFwiXFxuXCIsXG4gICAgICAgICAgMTAyOiBcIlxcZlwiLFxuICAgICAgICAgIDExNDogXCJcXHJcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBTdG9yZXMgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgdmFyIEluZGV4LCBTb3VyY2U7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlc2V0cyB0aGUgcGFyc2VyIHN0YXRlIGFuZCB0aHJvd3MgYSBgU3ludGF4RXJyb3JgLlxuICAgICAgICB2YXIgYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHRocm93IFN5bnRheEVycm9yKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJldHVybnMgdGhlIG5leHQgdG9rZW4sIG9yIGBcIiRcImAgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZFxuICAgICAgICAvLyB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLiBBIHRva2VuIG1heSBiZSBhIHN0cmluZywgbnVtYmVyLCBgbnVsbGBcbiAgICAgICAgLy8gbGl0ZXJhbCwgb3IgQm9vbGVhbiBsaXRlcmFsLlxuICAgICAgICB2YXIgbGV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHZhbHVlLCBiZWdpbiwgcG9zaXRpb24sIGlzU2lnbmVkLCBjaGFyQ29kZTtcbiAgICAgICAgICB3aGlsZSAoSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTM6IGNhc2UgMzI6XG4gICAgICAgICAgICAgICAgLy8gU2tpcCB3aGl0ZXNwYWNlIHRva2VucywgaW5jbHVkaW5nIHRhYnMsIGNhcnJpYWdlIHJldHVybnMsIGxpbmVcbiAgICAgICAgICAgICAgICAvLyBmZWVkcywgYW5kIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAxMjM6IGNhc2UgMTI1OiBjYXNlIDkxOiBjYXNlIDkzOiBjYXNlIDU4OiBjYXNlIDQ0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGEgcHVuY3R1YXRvciB0b2tlbiAoYHtgLCBgfWAsIGBbYCwgYF1gLCBgOmAsIG9yIGAsYCkgYXRcbiAgICAgICAgICAgICAgICAvLyB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNoYXJJbmRleEJ1Z2d5ID8gc291cmNlLmNoYXJBdChJbmRleCkgOiBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAgIC8vIGBcImAgZGVsaW1pdHMgYSBKU09OIHN0cmluZzsgYWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kXG4gICAgICAgICAgICAgICAgLy8gYmVnaW4gcGFyc2luZyB0aGUgc3RyaW5nLiBTdHJpbmcgdG9rZW5zIGFyZSBwcmVmaXhlZCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIgdG8gZGlzdGluZ3Vpc2ggdGhlbSBmcm9tIHB1bmN0dWF0b3JzIGFuZFxuICAgICAgICAgICAgICAgIC8vIGVuZC1vZi1zdHJpbmcgdG9rZW5zLlxuICAgICAgICAgICAgICAgIGZvciAodmFsdWUgPSBcIkBcIiwgSW5kZXgrKzsgSW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVuZXNjYXBlZCBBU0NJSSBjb250cm9sIGNoYXJhY3RlcnMgKHRob3NlIHdpdGggYSBjb2RlIHVuaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGFuIHRoZSBzcGFjZSBjaGFyYWN0ZXIpIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyQ29kZSA9PSA5Mikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIHJldmVyc2Ugc29saWR1cyAoYFxcYCkgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhbiBlc2NhcGVkXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRyb2wgY2hhcmFjdGVyIChpbmNsdWRpbmcgYFwiYCwgYFxcYCwgYW5kIGAvYCkgb3IgVW5pY29kZVxuICAgICAgICAgICAgICAgICAgICAvLyBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDkyOiBjYXNlIDM0OiBjYXNlIDQ3OiBjYXNlIDk4OiBjYXNlIDExNjogY2FzZSAxMTA6IGNhc2UgMTAyOiBjYXNlIDExNDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IFVuZXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSAxMTc6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBgXFx1YCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGEgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBmaXJzdCBjaGFyYWN0ZXIgYW5kIHZhbGlkYXRlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCBjb2RlIHBvaW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4ICsgNDsgSW5kZXggPCBwb3NpdGlvbjsgSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQSB2YWxpZCBzZXF1ZW5jZSBjb21wcmlzZXMgZm91ciBoZXhkaWdpdHMgKGNhc2UtXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluc2Vuc2l0aXZlKSB0aGF0IGZvcm0gYSBzaW5nbGUgaGV4YWRlY2ltYWwgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3IHx8IGNoYXJDb2RlID49IDk3ICYmIGNoYXJDb2RlIDw9IDEwMiB8fCBjaGFyQ29kZSA+PSA2NSAmJiBjaGFyQ29kZSA8PSA3MCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBmcm9tQ2hhckNvZGUoXCIweFwiICsgc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gQW4gdW5lc2NhcGVkIGRvdWJsZS1xdW90ZSBjaGFyYWN0ZXIgbWFya3MgdGhlIGVuZCBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9wdGltaXplIGZvciB0aGUgY29tbW9uIGNhc2Ugd2hlcmUgYSBzdHJpbmcgaXMgdmFsaWQuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjaGFyQ29kZSA+PSAzMiAmJiBjaGFyQ29kZSAhPSA5MiAmJiBjaGFyQ29kZSAhPSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIHRoZSBzdHJpbmcgYXMtaXMuXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmQgcmV0dXJuIHRoZSByZXZpdmVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVudGVybWluYXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBudW1iZXJzIGFuZCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgbmVnYXRpdmUgc2lnbiwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGFuIGludGVnZXIgb3IgZmxvYXRpbmctcG9pbnQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB7XG4gICAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIHplcm9lcyBhcmUgaW50ZXJwcmV0ZWQgYXMgb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4ICsgMSkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBvY3RhbCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBpbnRlZ2VyIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgIGZvciAoOyBJbmRleCA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBJbmRleCsrKTtcbiAgICAgICAgICAgICAgICAgIC8vIEZsb2F0cyBjYW5ub3QgY29udGFpbiBhIGxlYWRpbmcgZGVjaW1hbCBwb2ludDsgaG93ZXZlciwgdGhpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZSBpcyBhbHJlYWR5IGFjY291bnRlZCBmb3IgYnkgdGhlIHBhcnNlci5cbiAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZGVjaW1hbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCB0cmFpbGluZyBkZWNpbWFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIGV4cG9uZW50cy4gVGhlIGBlYCBkZW5vdGluZyB0aGUgZXhwb25lbnQgaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UtaW5zZW5zaXRpdmUuXG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAxMDEgfHwgY2hhckNvZGUgPT0gNjkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBwYXN0IHRoZSBzaWduIGZvbGxvd2luZyB0aGUgZXhwb25lbnQsIGlmIG9uZSBpc1xuICAgICAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0MyB8fCBjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGV4cG9uZW50aWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4OyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBlbXB0eSBleHBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDb2VyY2UgdGhlIHBhcnNlZCB2YWx1ZSB0byBhIEphdmFTY3JpcHQgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAgcmV0dXJuICtzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQSBuZWdhdGl2ZSBzaWduIG1heSBvbmx5IHByZWNlZGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBpZiAoaXNTaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGB0cnVlYCwgYGZhbHNlYCwgYW5kIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNSkgPT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA1O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwibnVsbFwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVucmVjb2duaXplZCB0b2tlbi5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXR1cm4gdGhlIHNlbnRpbmVsIGAkYCBjaGFyYWN0ZXIgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZCB0aGUgZW5kXG4gICAgICAgICAgLy8gb2YgdGhlIHNvdXJjZSBzdHJpbmcuXG4gICAgICAgICAgcmV0dXJuIFwiJFwiO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBQYXJzZXMgYSBKU09OIGB2YWx1ZWAgdG9rZW4uXG4gICAgICAgIHZhciBnZXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0cywgaGFzTWVtYmVycztcbiAgICAgICAgICBpZiAodmFsdWUgPT0gXCIkXCIpIHtcbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgZW5kIG9mIGlucHV0LlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBpZiAoKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pID09IFwiQFwiKSB7XG4gICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2VudGluZWwgYEBgIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGFyc2Ugb2JqZWN0IGFuZCBhcnJheSBsaXRlcmFscy5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIltcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIGFycmF5LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBhcnJheS5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIHNxdWFyZSBicmFja2V0IG1hcmtzIHRoZSBlbmQgb2YgdGhlIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGFycmF5IGxpdGVyYWwgY29udGFpbnMgZWxlbWVudHMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdGluZyB0aGUgcHJldmlvdXMgZWxlbWVudCBmcm9tIHRoZVxuICAgICAgICAgICAgICAgIC8vIG5leHQuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBhcnJheSBlbGVtZW50LlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBFbGlzaW9ucyBhbmQgbGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0KHZhbHVlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09IFwie1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gb2JqZWN0LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBjdXJseSBicmFjZSBtYXJrcyB0aGUgZW5kIG9mIHRoZSBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb2JqZWN0IGxpdGVyYWwgY29udGFpbnMgbWVtYmVycywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0b3IuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggb2JqZWN0IG1lbWJlci5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQsIG9iamVjdCBwcm9wZXJ0eSBuYW1lcyBtdXN0IGJlXG4gICAgICAgICAgICAgICAgLy8gZG91YmxlLXF1b3RlZCBzdHJpbmdzLCBhbmQgYSBgOmAgbXVzdCBzZXBhcmF0ZSBlYWNoIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgLy8gbmFtZSBhbmQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiIHx8IHR5cGVvZiB2YWx1ZSAhPSBcInN0cmluZ1wiIHx8IChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSAhPSBcIkBcIiB8fCBsZXgoKSAhPSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0c1t2YWx1ZS5zbGljZSgxKV0gPSBnZXQobGV4KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0b2tlbiBlbmNvdW50ZXJlZC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogVXBkYXRlcyBhIHRyYXZlcnNlZCBvYmplY3QgbWVtYmVyLlxuICAgICAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIGVsZW1lbnQgPSB3YWxrKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3VyY2VbcHJvcGVydHldID0gZWxlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBhIHBhcnNlZCBKU09OIG9iamVjdCwgaW52b2tpbmcgdGhlXG4gICAgICAgIC8vIGBjYWxsYmFja2AgZnVuY3Rpb24gZm9yIGVhY2ggdmFsdWUuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBXYWxrKGhvbGRlciwgbmFtZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIHZhciB3YWxrID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW3Byb3BlcnR5XSwgbGVuZ3RoO1xuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gYGZvckVhY2hgIGNhbid0IGJlIHVzZWQgdG8gdHJhdmVyc2UgYW4gYXJyYXkgaW4gT3BlcmEgPD0gOC41NFxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpdHMgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW1wbGVtZW50YXRpb24gcmV0dXJucyBgZmFsc2VgXG4gICAgICAgICAgICAvLyBmb3IgYXJyYXkgaW5kaWNlcyAoZS5nLiwgYCFbMSwgMiwgM10uaGFzT3duUHJvcGVydHkoXCIwXCIpYCkuXG4gICAgICAgICAgICBpZiAoZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBsZW5ndGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwoc291cmNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04ucGFyc2VgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCwgdmFsdWU7XG4gICAgICAgICAgSW5kZXggPSAwO1xuICAgICAgICAgIFNvdXJjZSA9IFwiXCIgKyBzb3VyY2U7XG4gICAgICAgICAgcmVzdWx0ID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAvLyBJZiBhIEpTT04gc3RyaW5nIGNvbnRhaW5zIG11bHRpcGxlIHRva2VucywgaXQgaXMgaW52YWxpZC5cbiAgICAgICAgICBpZiAobGV4KCkgIT0gXCIkXCIpIHtcbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlc2V0IHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayAmJiBnZXRDbGFzcy5jYWxsKGNhbGxiYWNrKSA9PSBmdW5jdGlvbkNsYXNzID8gd2FsaygodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSByZXN1bHQsIHZhbHVlKSwgXCJcIiwgY2FsbGJhY2spIDogcmVzdWx0O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydHNbXCJydW5JbkNvbnRleHRcIl0gPSBydW5JbkNvbnRleHQ7XG4gICAgcmV0dXJuIGV4cG9ydHM7XG4gIH1cblxuICBpZiAoZnJlZUV4cG9ydHMgJiYgIWlzTG9hZGVyKSB7XG4gICAgLy8gRXhwb3J0IGZvciBDb21tb25KUyBlbnZpcm9ubWVudHMuXG4gICAgcnVuSW5Db250ZXh0KHJvb3QsIGZyZWVFeHBvcnRzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBFeHBvcnQgZm9yIHdlYiBicm93c2VycyBhbmQgSmF2YVNjcmlwdCBlbmdpbmVzLlxuICAgIHZhciBuYXRpdmVKU09OID0gcm9vdC5KU09OLFxuICAgICAgICBwcmV2aW91c0pTT04gPSByb290W1wiSlNPTjNcIl0sXG4gICAgICAgIGlzUmVzdG9yZWQgPSBmYWxzZTtcblxuICAgIHZhciBKU09OMyA9IHJ1bkluQ29udGV4dChyb290LCAocm9vdFtcIkpTT04zXCJdID0ge1xuICAgICAgLy8gUHVibGljOiBSZXN0b3JlcyB0aGUgb3JpZ2luYWwgdmFsdWUgb2YgdGhlIGdsb2JhbCBgSlNPTmAgb2JqZWN0IGFuZFxuICAgICAgLy8gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgYEpTT04zYCBvYmplY3QuXG4gICAgICBcIm5vQ29uZmxpY3RcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWlzUmVzdG9yZWQpIHtcbiAgICAgICAgICBpc1Jlc3RvcmVkID0gdHJ1ZTtcbiAgICAgICAgICByb290LkpTT04gPSBuYXRpdmVKU09OO1xuICAgICAgICAgIHJvb3RbXCJKU09OM1wiXSA9IHByZXZpb3VzSlNPTjtcbiAgICAgICAgICBuYXRpdmVKU09OID0gcHJldmlvdXNKU09OID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSlNPTjM7XG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgcm9vdC5KU09OID0ge1xuICAgICAgXCJwYXJzZVwiOiBKU09OMy5wYXJzZSxcbiAgICAgIFwic3RyaW5naWZ5XCI6IEpTT04zLnN0cmluZ2lmeVxuICAgIH07XG4gIH1cblxuICAvLyBFeHBvcnQgZm9yIGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy5cbiAgaWYgKGlzTG9hZGVyKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBKU09OMztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIid1c2Ugc3RyaWN0Jztcbi8qIGdsb2JhbHMgd2luZG93LCBhbmd1bGFyICovXG5cbndpbmRvdy52bFNjaGVtYSA9IGRsLmpzb24oJ2Jvd2VyX2NvbXBvbmVudHMvdmVnYS1saXRlL3ZlZ2EtbGl0ZS1zY2hlbWEuanNvbicpO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScsIFtcbiAgICAnTG9jYWxTdG9yYWdlTW9kdWxlJyxcbiAgICAnYW5ndWxhci1nb29nbGUtYW5hbHl0aWNzJ1xuICBdKVxuICAuY29uc3RhbnQoJ18nLCB3aW5kb3cuXylcbiAgLy8gZGF0YWxpYiwgdmVnYWxpdGUsIHZlZ2FcbiAgLmNvbnN0YW50KCdkbCcsIHdpbmRvdy5kbClcbiAgLmNvbnN0YW50KCd2bCcsIHdpbmRvdy52bClcbiAgLmNvbnN0YW50KCd2ZycsIHdpbmRvdy52ZylcbiAgLy8gb3RoZXIgbGlicmFyaWVzXG4gIC5jb25zdGFudCgnQmxvYicsIHdpbmRvdy5CbG9iKVxuICAuY29uc3RhbnQoJ1VSTCcsIHdpbmRvdy5VUkwpXG4gIC5jb25zdGFudCgnRHJvcCcsIHdpbmRvdy5Ecm9wKVxuICAuY29uc3RhbnQoJ0hlYXAnLCB3aW5kb3cuSGVhcClcbiAgLy8gVXNlIHRoZSBjdXN0b21pemVkIHZlbmRvci9qc29uMy1jb21wYWN0c3RyaW5naWZ5XG4gIC5jb25zdGFudCgnSlNPTjMnLCB3aW5kb3cuSlNPTjMubm9Db25mbGljdCgpKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBkZWZhdWx0Q29uZmlnU2V0OiAnbGFyZ2UnLFxuICAgIGFwcElkOiAndmx1aScsXG4gICAgLy8gZW1iZWRkZWQgcG9sZXN0YXIgYW5kIHZveWFnZXIgd2l0aCBrbm93biBkYXRhXG4gICAgZW1iZWRkZWREYXRhOiB3aW5kb3cudmd1aURhdGEgfHwgdW5kZWZpbmVkLFxuICAgIHByaW9yaXR5OiB7XG4gICAgICBib29rbWFyazogMCxcbiAgICAgIHBvcHVwOiAwLFxuICAgICAgdmlzbGlzdDogMTAwMFxuICAgIH0sXG4gICAgbXlyaWFSZXN0OiAnaHR0cDovL2VjMi01Mi0xLTM4LTE4Mi5jb21wdXRlLTEuYW1hem9uYXdzLmNvbTo4NzUzJyxcbiAgICBkZWZhdWx0VGltZUZuOiAneWVhcicsXG4gICAgdHlwZU5hbWVzOiB7XG4gICAgICBub21pbmFsOiAndGV4dCcsXG4gICAgICBvcmRpbmFsOiAndGV4dC1vcmRpbmFsJyxcbiAgICAgIHF1YW50aXRhdGl2ZTogJ251bWJlcicsXG4gICAgICB0ZW1wb3JhbDogJ3RpbWUnLFxuICAgICAgZ2VvZ3JhcGhpYzogJ2dlbydcbiAgICB9XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoXCJ2bHVpXCIpLnJ1bihbXCIkdGVtcGxhdGVDYWNoZVwiLCBmdW5jdGlvbigkdGVtcGxhdGVDYWNoZSkgeyR0ZW1wbGF0ZUNhY2hlLnB1dChcImFsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhbGVydC1ib3hcXFwiIG5nLXNob3c9XFxcIkFsZXJ0cy5hbGVydHMubGVuZ3RoID4gMFxcXCI+PGRpdiBjbGFzcz1cXFwiYWxlcnQtaXRlbVxcXCIgbmctcmVwZWF0PVxcXCJhbGVydCBpbiBBbGVydHMuYWxlcnRzXFxcIj57eyBhbGVydC5tc2cgfX0gPGEgY2xhc3M9XFxcImNsb3NlXFxcIiBuZy1jbGljaz1cXFwiQWxlcnRzLmNsb3NlQWxlcnQoJGluZGV4KVxcXCI+JnRpbWVzOzwvYT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiYm9va21hcmstbGlzdFxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyIGNhcmQgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW5cXFwiPjxtb2RhbC1jbG9zZS1idXR0b24gb24tY2xvc2U9XFxcImxvZ0Jvb2ttYXJrc0Nsb3NlZCgpXFxcIj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDIgY2xhc3M9XFxcIm5vLWJvdHRvbS1tYXJnaW5cXFwiPkJvb2ttYXJrcyAoe3sgQm9va21hcmtzLmxlbmd0aCB9fSk8L2gyPjxhIG5nLWNsaWNrPVxcXCJCb29rbWFya3MuY2xlYXIoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXRyYXNoLW9cXFwiPjwvaT4gQ2xlYXIgYWxsPC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZsZXgtZ3Jvdy0xIHNjcm9sbC15XFxcIj48ZGl2IG5nLWlmPVxcXCJCb29rbWFya3MubGVuZ3RoID4gMFxcXCIgY2xhc3M9XFxcImhmbGV4IGZsZXgtd3JhcFxcXCI+PHZsLXBsb3QtZ3JvdXAgbmctcmVwZWF0PVxcXCJjaGFydCBpbiBCb29rbWFya3MuZGljdCB8IG9yZGVyT2JqZWN0QnkgOiBcXCd0aW1lQWRkZWRcXCcgOiBmYWxzZVxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cCBjYXJkXFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGZpZWxkLXNldD1cXFwiY2hhcnQuZmllbGRTZXRcXFwiIHNob3ctYm9va21hcms9XFxcInRydWVcXFwiIHNob3ctZGVidWc9XFxcImNvbnN0cy5kZWJ1Z1xcXCIgc2hvdy1leHBhbmQ9XFxcImZhbHNlXFxcIiBhbHdheXMtc2VsZWN0ZWQ9XFxcInRydWVcXFwiIGhpZ2hsaWdodGVkPVxcXCJoaWdobGlnaHRlZFxcXCIgb3ZlcmZsb3c9XFxcInRydWVcXFwiIHRvb2x0aXA9XFxcInRydWVcXFwiIHByaW9yaXR5PVxcXCJjb25zdHMucHJpb3JpdHkuYm9va21hcmtcXFwiPjwvdmwtcGxvdC1ncm91cD48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1lbXB0eVxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5sZW5ndGggPT09IDBcXFwiPllvdSBoYXZlIG5vIGJvb2ttYXJrczwvZGl2PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLW15cmlhLWRhdGFzZXRcXFwiPjxwPlNlbGVjdCBhIGRhdGFzZXQgZnJvbSB0aGUgTXlyaWEgaW5zdGFuY2UgYXQgPGlucHV0IG5nLW1vZGVsPVxcXCJteXJpYVJlc3RVcmxcXFwiPjxidXR0b24gbmctY2xpY2s9XFxcImxvYWREYXRhc2V0cyhcXCdcXCcpXFxcIj51cGRhdGU8L2J1dHRvbj4uPC9wPjxmb3JtIG5nLXN1Ym1pdD1cXFwiYWRkRGF0YXNldChteXJpYURhdGFzZXQpXFxcIj48ZGl2PjxzZWxlY3QgbmFtZT1cXFwibXlyaWEtZGF0YXNldFxcXCIgaWQ9XFxcInNlbGVjdC1teXJpYS1kYXRhc2V0XFxcIiBuZy1kaXNhYmxlZD1cXFwiZGlzYWJsZWRcXFwiIG5nLW1vZGVsPVxcXCJteXJpYURhdGFzZXRcXFwiIG5nLW9wdGlvbnM9XFxcIm9wdGlvbk5hbWUoZGF0YXNldCkgZm9yIGRhdGFzZXQgaW4gbXlyaWFEYXRhc2V0cyB0cmFjayBieSBkYXRhc2V0LnJlbGF0aW9uTmFtZVxcXCI+PG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj5TZWxlY3QgRGF0YXNldC4uLjwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YXNldDwvYnV0dG9uPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWRkLXVybC1kYXRhc2V0XFxcIj48cD5BZGQgdGhlIG5hbWUgb2YgdGhlIGRhdGFzZXQgYW5kIHRoZSBVUkwgdG8gYSA8Yj5KU09OPC9iPiBvciA8Yj5DU1Y8L2I+ICh3aXRoIGhlYWRlcikgZmlsZS4gTWFrZSBzdXJlIHRoYXQgdGhlIGZvcm1hdHRpbmcgaXMgY29ycmVjdCBhbmQgY2xlYW4gdGhlIGRhdGEgYmVmb3JlIGFkZGluZyBpdC4gVGhlIGFkZGVkIGRhdGFzZXQgaXMgb25seSB2aXNpYmxlIHRvIHlvdS48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGRGcm9tVXJsKGFkZGVkRGF0YXNldClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHR5cGU9XFxcInRleHRcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtdXJsXFxcIj5VUkw8L2xhYmVsPiA8aW5wdXQgbmctbW9kZWw9XFxcImFkZGVkRGF0YXNldC51cmxcXFwiIGlkPVxcXCJkYXRhc2V0LXVybFxcXCIgdHlwZT1cXFwidXJsXFxcIj48cD5NYWtlIHN1cmUgdGhhdCB5b3UgaG9zdCB0aGUgZmlsZSBvbiBhIHNlcnZlciB0aGF0IGhhcyA8Y29kZT5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW46ICo8L2NvZGU+IHNldC48L3A+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJjaGFuZ2UtbG9hZGVkLWRhdGFzZXRcXFwiPjxkaXYgbmctaWY9XFxcInVzZXJEYXRhLmxlbmd0aFxcXCI+PGgzPlVwbG9hZGVkIERhdGFzZXRzPC9oMz48dWw+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiB1c2VyRGF0YSB0cmFjayBieSBkYXRhc2V0LmlkXFxcIiBuZy1jbGFzcz1cXFwie3NlbGVjdGVkOiBEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkfVxcXCI+PGEgY2xhc3M9XFxcImRhdGFzZXRcXFwiIG5nLWNsaWNrPVxcXCJzZWxlY3REYXRhc2V0KGRhdGFzZXQpXFxcIiBuZy1kaXNhYmxlZD1cXFwiRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWRhdGFiYXNlXFxcIj48L2k+IDxzdHJvbmc+e3tkYXRhc2V0Lm5hbWV9fTwvc3Ryb25nPjwvYT4gPHNwYW4gbmctaWY9XFxcImRhdGFzZXQuZGVzY3JpcHRpb25cXFwiPnt7ZGF0YXNldC5kZXNjcmlwdGlvbn19PC9zcGFuPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+PC9saT48L3VsPjwvZGl2PjxoMz5FeHBsb3JlIGEgU2FtcGxlIERhdGFzZXQ8L2gzPjx1bCBjbGFzcz1cXFwibG9hZGVkLWRhdGFzZXQtbGlzdFxcXCI+PGxpIG5nLXJlcGVhdD1cXFwiZGF0YXNldCBpbiBzYW1wbGVEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3Ryb25nIG5nLWlmPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0ID09PSBkYXRhc2V0XFxcIj4oc2VsZWN0ZWQpPC9zdHJvbmc+IDxlbSBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L2VtPjwvbGk+PC91bD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRtb2RhbC5odG1sXCIsXCI8bW9kYWwgaWQ9XFxcImRhdGFzZXQtbW9kYWxcXFwiIG1heC13aWR0aD1cXFwiODAwcHhcXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLWhlYWRlclxcXCI+PG1vZGFsLWNsb3NlLWJ1dHRvbj48L21vZGFsLWNsb3NlLWJ1dHRvbj48aDI+QWRkIERhdGFzZXQ8L2gyPjwvZGl2PjxkaXYgY2xhc3M9XFxcIm1vZGFsLW1haW5cXFwiPjx0YWJzZXQ+PHRhYiBoZWFkaW5nPVxcXCJDaGFuZ2UgRGF0YXNldFxcXCI+PGNoYW5nZS1sb2FkZWQtZGF0YXNldD48L2NoYW5nZS1sb2FkZWQtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIlBhc3RlIG9yIFVwbG9hZCBEYXRhXFxcIj48cGFzdGUtZGF0YXNldD48L3Bhc3RlLWRhdGFzZXQ+PC90YWI+PHRhYiBoZWFkaW5nPVxcXCJGcm9tIFVSTFxcXCI+PGFkZC11cmwtZGF0YXNldD48L2FkZC11cmwtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gTXlyaWFcXFwiPjxhZGQtbXlyaWEtZGF0YXNldD48L2FkZC1teXJpYS1kYXRhc2V0PjwvdGFiPjwvdGFic2V0PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbFwiLFwiPGJ1dHRvbiBpZD1cXFwic2VsZWN0LWRhdGFcXFwiIGNsYXNzPVxcXCJzbWFsbC1idXR0b24gc2VsZWN0LWRhdGFcXFwiIG5nLWNsaWNrPVxcXCJsb2FkRGF0YXNldCgpO1xcXCI+Q2hhbmdlPC9idXR0b24+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcHpvbmVcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9wYXN0ZWRhdGFzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicGFzdGUtZGF0YVxcXCI+PGZpbGUtZHJvcHpvbmUgZGF0YXNldD1cXFwiZGF0YXNldFxcXCIgbWF4LWZpbGUtc2l6ZT1cXFwiMTBcXFwiIHZhbGlkLW1pbWUtdHlwZXM9XFxcIlt0ZXh0L2NzdiwgdGV4dC9qc29uLCB0ZXh0L3Rzdl1cXFwiPjxkaXYgY2xhc3M9XFxcInVwbG9hZC1kYXRhXFxcIj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48bGFiZWwgZm9yPVxcXCJkYXRhc2V0LWZpbGVcXFwiPkZpbGU8L2xhYmVsPiA8aW5wdXQgdHlwZT1cXFwiZmlsZVxcXCIgaWQ9XFxcImRhdGFzZXQtZmlsZVxcXCIgYWNjZXB0PVxcXCJ0ZXh0L2Nzdix0ZXh0L3RzdlxcXCI+PC9kaXY+PHA+VXBsb2FkIGEgQ1NWLCBvciBwYXN0ZSBkYXRhIGluIDxhIGhyZWY9XFxcImh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0NvbW1hLXNlcGFyYXRlZF92YWx1ZXNcXFwiPkNTVjwvYT4gZm9ybWF0IGludG8gdGhlIGZpZWxkcy48L3A+PGRpdiBjbGFzcz1cXFwiZHJvcHpvbmUtdGFyZ2V0XFxcIj48cD5Ecm9wIENTViBmaWxlIGhlcmU8L3A+PC9kaXY+PC9kaXY+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KClcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtbmFtZVxcXCI+TmFtZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJuYW1lXFxcIiBuZy1tb2RlbD1cXFwiZGF0YXNldC5uYW1lXFxcIiBpZD1cXFwiZGF0YXNldC1uYW1lXFxcIiByZXF1aXJlZD1cXFwiXFxcIj48L2Rpdj48ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj48dGV4dGFyZWEgbmctbW9kZWw9XFxcImRhdGFzZXQuZGF0YVxcXCIgbmctbW9kZWwtb3B0aW9ucz1cXFwieyB1cGRhdGVPbjogXFwnZGVmYXVsdCBibHVyXFwnLCBkZWJvdW5jZTogeyBcXCdkZWZhdWx0XFwnOiAxNywgXFwnYmx1clxcJzogMCB9fVxcXCIgcmVxdWlyZWQ9XFxcIlxcXCI+XFxuICAgICAgPC90ZXh0YXJlYT48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGE8L2J1dHRvbj48L2Zvcm0+PC9maWxlLWRyb3B6b25lPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImZpZWxkaW5mby9maWVsZGluZm8uaHRtbFwiLFwiPHNwYW4gY2xhc3M9XFxcImZpZWxkLWluZm9cXFwiPjxzcGFuIGNsYXNzPVxcXCJoZmxleCBmdWxsLXdpZHRoXFxcIiBuZy1jbGljaz1cXFwiY2xpY2tlZCgkZXZlbnQpXFxcIj48c3BhbiBjbGFzcz1cXFwidHlwZS1jYXJldFxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6ICFkaXNhYmxlQ291bnRDYXJldCB8fCBmaWVsZERlZi5hZ2dyZWdhdGUhPT1cXCdjb3VudFxcJ31cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duXFxcIiBuZy1zaG93PVxcXCJzaG93Q2FyZXRcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcInR5cGUgZmEge3tpY29ufX1cXFwiIG5nLXNob3c9XFxcInNob3dUeXBlXFxcIiB0aXRsZT1cXFwie3t0eXBlTmFtZXNbZmllbGREZWYudHlwZV19fVxcXCI+PC9zcGFuPjwvc3Bhbj4gPHNwYW4gbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSE9PVxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmllbGQtaW5mby10ZXh0XFxcIj48c3BhbiBuZy1pZj1cXFwiZnVuYyhmaWVsZERlZilcXFwiIGNsYXNzPVxcXCJmaWVsZC1mdW5jXFxcIiBuZy1jbGFzcz1cXFwie2FueTogZmllbGREZWYuX2FueX1cXFwiPnt7IGZ1bmMoZmllbGREZWYpIH19PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIiBuZy1jbGFzcz1cXFwie2hhc2Z1bmM6IGZ1bmMoZmllbGREZWYpLCBhbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyBmaWVsZERlZi5maWVsZCB8IHVuZGVyc2NvcmUyc3BhY2UgfX08L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlPT09XFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmaWVsZC1jb3VudCBmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIGNsYXNzPVxcXCJmaWVsZC1uYW1lXFxcIj5DT1VOVDwvc3Bhbj48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgcmVtb3ZlXFxcIiBuZy1zaG93PVxcXCJzaG93UmVtb3ZlXFxcIj48YSBjbGFzcz1cXFwicmVtb3ZlLWZpZWxkXFxcIiBuZy1jbGljaz1cXFwicmVtb3ZlQWN0aW9uKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10aW1lc1xcXCI+PC9pPjwvYT48L3NwYW4+IDxzcGFuIGNsYXNzPVxcXCJuby1zaHJpbmsgaW5mb1xcXCIgbmctc2hvdz1cXFwic2hvd0luZm9cXFwiPjxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgIT09IFxcJ2NvdW50XFwnICYmIGNvbnRhaW5zVHlwZShbdmxUeXBlLk5PTUlOQUwsIHZsVHlwZS5PUkRJTkFMXSwgZmllbGREZWYudHlwZSlcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWlufX08YnI+IDxzdHJvbmc+TWF4Ojwvc3Ryb25nPiB7e3N0YXRzLm1heH19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPiA8aSBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlICE9PSBcXCdjb3VudFxcJyAmJiBmaWVsZERlZi50eXBlID09PSB2bFR5cGUuVEVNUE9SQUxcXFwiIGNsYXNzPVxcXCJmYSBmYS1pbmZvLWNpcmNsZVxcXCIgdG9vbHRpcHM9XFxcIlxcXCIgdG9vbHRpcC1zaXplPVxcXCJzbWFsbFxcXCIgdG9vbHRpcC1odG1sPVxcXCI8ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz4gPHN0cm9uZz5OYW1lOjwvc3Ryb25nPiB7e2ZpZWxkRGVmLmZpZWxkfX08YnI+IDxzdHJvbmc+Q2FyZGluYWxpdHk6PC9zdHJvbmc+IHt7c3RhdHMuZGlzdGluY3QgfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NaW46PC9zdHJvbmc+IHt7c3RhdHMubWluIHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgZGF0ZTogc2hvcnR9fTxicj4gPHN0cm9uZz5TYW1wbGU6PC9zdHJvbmc+IDxzcGFuIGNsYXNzPVxcJ3NhbXBsZVxcJz57e3N0YXRzLnNhbXBsZS5qb2luKFxcJywgXFwnKX19PC9zcGFuPiA8L2Rpdj5cXFwiIHRvb2x0aXAtc2lkZT1cXFwicmlnaHRcXFwiPjwvaT4gPGkgbmctaWY9XFxcImZpZWxkRGVmLmFnZ3JlZ2F0ZSAhPT0gXFwnY291bnRcXCcgJiYgZmllbGREZWYudHlwZSA9PT0gdmxUeXBlLlFVQU5USVRBVElWRVxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxkaXYgY2xhc3M9XFwndG9vbHRpcC1jb250ZW50XFwnPiA8c3Ryb25nPk5hbWU6PC9zdHJvbmc+IHt7ZmllbGREZWYuZmllbGR9fTxicj4gPHN0cm9uZz5DYXJkaW5hbGl0eTo8L3N0cm9uZz4ge3tzdGF0cy5kaXN0aW5jdCB8IG51bWJlcn19PGJyPiA8c3Ryb25nPk1pbjo8L3N0cm9uZz4ge3tzdGF0cy5taW4gfCBudW1iZXJ9fTxicj4gPHN0cm9uZz5NYXg6PC9zdHJvbmc+IHt7c3RhdHMubWF4IHwgbnVtYmVyfX08YnI+IDxzdHJvbmc+U3RkZXY6PC9zdHJvbmc+IHt7c3RhdHMuc3RkZXYgfCBudW1iZXI6Mn19PGJyPiA8c3Ryb25nPk1lYW46PC9zdHJvbmc+IHt7c3RhdHMubWVhbiB8IG51bWJlcjoyfX08YnI+IDxzdHJvbmc+TWVkaWFuOjwvc3Ryb25nPiB7e3N0YXRzLm1lZGlhbiB8IG51bWJlcn19PGJyPiA8c3Ryb25nPlNhbXBsZTo8L3N0cm9uZz4gPHNwYW4gY2xhc3M9XFwnc2FtcGxlXFwnPnt7c3RhdHMuc2FtcGxlLmpvaW4oXFwnLCBcXCcpfX08L3NwYW4+IDwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9pPjxpIG5nLWlmPVxcXCJmaWVsZERlZi5hZ2dyZWdhdGUgPT09IFxcJ2NvdW50XFwnXFxcIiBjbGFzcz1cXFwiZmEgZmEtaW5mby1jaXJjbGVcXFwiIHRvb2x0aXBzPVxcXCJcXFwiIHRvb2x0aXAtc2l6ZT1cXFwic21hbGxcXFwiIHRvb2x0aXAtaHRtbD1cXFwiPGRpdiBjbGFzcz1cXCd0b29sdGlwLWNvbnRlbnRcXCc+IDxzdHJvbmc+Q291bnQ6PC9zdHJvbmc+IHt7c3RhdHMubWF4fX0gPC9kaXY+XFxcIiB0b29sdGlwLXNpZGU9XFxcInJpZ2h0XFxcIj48L2k+PC9zcGFuPjwvc3Bhbj48L3NwYW4+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwibW9kYWwvbW9kYWwuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwibW9kYWxcXFwiIG5nLWlmPVxcXCJpc09wZW5cXFwiPjxkaXYgY2xhc3M9XFxcIm1vZGFsLXdyYXBwZXJcXFwiIHN0eWxlPVxcXCJ7e3dyYXBwZXJTdHlsZX19XFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcIm1vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPjxhIG5nLWNsaWNrPVxcXCJjbG9zZU1vZGFsKClcXFwiIGNsYXNzPVxcXCJyaWdodFxcXCI+Q2xvc2U8L2E+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidGFicy90YWIuaHRtbFwiLFwiPGRpdiBuZy1pZj1cXFwiYWN0aXZlXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcInRhYnMvdGFic2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInRhYi1jb250YWluZXJcXFwiPjxkaXY+PGEgY2xhc3M9XFxcInRhYlxcXCIgbmctcmVwZWF0PVxcXCJ0YWIgaW4gdGFic2V0LnRhYnNcXFwiIG5nLWNsYXNzPVxcXCJ7XFwnYWN0aXZlXFwnOiB0YWIuYWN0aXZlfVxcXCIgbmctY2xpY2s9XFxcInRhYnNldC5zaG93VGFiKHRhYilcXFwiPnt7dGFiLmhlYWRpbmd9fTwvYT48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0YWItY29udGVudHNcXFwiIG5nLXRyYW5zY2x1ZGU9XFxcIlxcXCI+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwidmxwbG90L3ZscGxvdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90XFxcIiBpZD1cXFwidmlzLXt7dmlzSWR9fVxcXCIgbmctY2xhc3M9XFxcInsgZml0OiAhYWx3YXlzU2Nyb2xsYWJsZSAmJiAhb3ZlcmZsb3cgJiYgKG1heEhlaWdodCAmJiAoIWhlaWdodCB8fCBoZWlnaHQgPD0gbWF4SGVpZ2h0KSkgJiYgKG1heFdpZHRoICYmICghd2lkdGggfHwgd2lkdGggPD0gbWF4V2lkdGgpKSwgb3ZlcmZsb3c6IGFsd2F5c1Njcm9sbGFibGUgfHwgb3ZlcmZsb3cgfHwgKG1heEhlaWdodCAmJiBoZWlnaHQgJiYgaGVpZ2h0ID4gbWF4SGVpZ2h0KSB8fCAobWF4V2lkdGggJiYgd2lkdGggJiYgd2lkdGggPiBtYXhXaWR0aCksIHNjcm9sbDogYWx3YXlzU2Nyb2xsYWJsZSB8fCB1bmxvY2tlZCB8fCBob3ZlckZvY3VzIH1cXFwiIG5nLW1vdXNlZG93bj1cXFwidW5sb2NrZWQ9IXRodW1ibmFpbFxcXCIgbmctbW91c2V1cD1cXFwidW5sb2NrZWQ9ZmFsc2VcXFwiIG5nLW1vdXNlb3Zlcj1cXFwibW91c2VvdmVyKClcXFwiIG5nLW1vdXNlb3V0PVxcXCJtb3VzZW91dCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJ2aXMtdG9vbHRpcFxcXCIgbmctc2hvdz1cXFwidG9vbHRpcEFjdGl2ZVxcXCI+PHRhYmxlPjx0ciBuZy1yZXBlYXQ9XFxcInAgaW4gZGF0YVxcXCI+PHRkIGNsYXNzPVxcXCJrZXlcXFwiPnt7cFswXX19PC90ZD48dGQgY2xhc3M9XFxcInZhbHVlXFxcIj48Yj57e3BbMV19fTwvYj48L3RkPjwvdHI+PC90YWJsZT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwIHZmbGV4XFxcIj48ZGl2IG5nLXNob3c9XFxcInNob3dFeHBhbmQgfHwgZmllbGRTZXQgfHwgc2hvd1RyYW5zcG9zZSB8fCBzaG93Qm9va21hcmsgJiYgQm9va21hcmtzLmlzU3VwcG9ydGVkIHx8IHNob3dUb2dnbGVcXFwiIGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwLWhlYWRlciBuby1zaHJpbmtcXFwiPjxkaXYgY2xhc3M9XFxcImZpZWxkLXNldC1pbmZvXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkRGVmIGluIGZpZWxkU2V0XFxcIiBuZy1pZj1cXFwiZmllbGRTZXRcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgbmctY2xhc3M9XFxcInsgc2VsZWN0ZWQ6IGFsd2F5c1NlbGVjdGVkIHx8IChpc1NlbGVjdGVkICYmIGlzU2VsZWN0ZWQoZmllbGREZWYuZmllbGQpKSwgdW5zZWxlY3RlZDogaXNTZWxlY3RlZCAmJiAhaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCksIGhpZ2hsaWdodGVkOiAoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gfVxcXCIgbmctbW91c2VvdmVyPVxcXCIoaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gPSB0cnVlXFxcIiBuZy1tb3VzZW91dD1cXFwiKGhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdID0gZmFsc2VcXFwiPjwvZmllbGQtaW5mbz48L2Rpdj48ZGl2IGNsYXNzPVxcXCJ0b29sYm94XFxcIj48YSBuZy1pZj1cXFwiY29uc3RzLmRlYnVnICYmIHNob3dEZWJ1Z1xcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS13cmVuY2hcXFwiIG5nLWNsaWNrPVxcXCJzaENvcGllZD1cXCdcXCc7IHZsQ29waWVkPVxcJ1xcJzsgdmdDb3BpZWQ9XFwnXFwnO1xcXCIgbmctbW91c2VvdmVyPVxcXCJpbml0aWFsaXplUG9wdXAoKTtcXFwiPjwvaT48L2E+PHZsLXBsb3QtZ3JvdXAtcG9wdXAgbmctaWY9XFxcImNvbnN0cy5kZWJ1ZyAmJiBzaG93RGVidWcgJiYgcmVuZGVyUG9wdXBcXFwiPjwvdmwtcGxvdC1ncm91cC1wb3B1cD48YSBuZy1pZj1cXFwic2hvd01hcmtcXFwiIGNsYXNzPVxcXCJjb21tYW5kIGRpc2FibGVkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZm9udFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtbGluZS1jaGFydFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtYXJlYS1jaGFydFxcXCI+PC9pPiA8aSBjbGFzcz1cXFwiZmEgZmEtYmFyLWNoYXJ0XFxcIj48L2k+IDxpIGNsYXNzPVxcXCJmYSBmYS1jaXJjbGUtb1xcXCI+PC9pPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwibG9nLnRvZ2dsZShjaGFydC52bFNwZWMsIFxcJ3hcXCcpXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogbG9nLmFjdGl2ZShjaGFydC52bFNwZWMsIFxcJ3hcXCcpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWxvbmctYXJyb3ctcmlnaHRcXFwiPjwvaT4gPHNtYWxsPkxvZyBYPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93TG9nICYmIGNoYXJ0LnZsU3BlYyAmJiBsb2cuc3VwcG9ydChjaGFydC52bFNwZWMsIFxcJ3lcXCcpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcImxvZy50b2dnbGUoY2hhcnQudmxTcGVjLCBcXCd5XFwnKVxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6IGxvZy5hY3RpdmUoY2hhcnQudmxTcGVjLCBcXCd5XFwnKX1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1sb25nLWFycm93LXVwXFxcIj48L2k+IDxzbWFsbD5Mb2cgWTwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1NvcnQgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZVNvcnQuc3VwcG9ydChjaGFydC52bFNwZWMsIERhdGFzZXQuc3RhdHMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZVNvcnQudG9nZ2xlKGNoYXJ0LnZsU3BlYylcXFwiPjxpIGNsYXNzPVxcXCJmYSBzb3J0XFxcIiBuZy1jbGFzcz1cXFwidG9nZ2xlU29ydENsYXNzKGNoYXJ0LnZsU3BlYylcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPlNvcnQ8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dGaWx0ZXJOdWxsICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQoY2hhcnQudmxTcGVjLCBEYXRhc2V0LnN0YXRzKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVGaWx0ZXJOdWxsKGNoYXJ0LnZsU3BlYylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBjaGFydC52bFNwZWMgJiYgY2hhcnQudmxTcGVjLmNmZy5maWx0ZXJOdWxsLk99XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZmlsdGVyXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5GaWx0ZXI8L3NtYWxsPiA8c21hbGw+TlVMTDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd1RyYW5zcG9zZVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0cmFuc3Bvc2UoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXJlZnJlc2ggdHJhbnNwb3NlXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Td2FwIFgvWTwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJCb29rbWFya3MudG9nZ2xlKGNoYXJ0KVxcXCIgbmctY2xhc3M9XFxcIntkaXNhYmxlZDogIWNoYXJ0LnZsU3BlYy5lbmNvZGluZywgYWN0aXZlOiBCb29rbWFya3MuaXNCb29rbWFya2VkKGNoYXJ0LnNob3J0aGFuZCl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYm9va21hcmtcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkJvb2ttYXJrPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93RXhwYW5kXFxcIiBuZy1jbGljaz1cXFwiZXhwYW5kQWN0aW9uKClcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXhwYW5kXFxcIj48L2k+PC9hPjwvZGl2PjwvZGl2Pjx2bC1wbG90IGNsYXNzPVxcXCJmbGV4LWdyb3ctMVxcXCIgZGF0YS1maWVsZHNldD1cXFwie2ZpZWxkU2V0LmtleX19XFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgaXMtaW4tbGlzdD1cXFwiaXNJbkxpc3RcXFwiIGFsd2F5cy1zY3JvbGxhYmxlPVxcXCJhbHdheXNTY3JvbGxhYmxlXFxcIiBjb25maWctc2V0PVxcXCJ7e2NvbmZpZ1NldHx8XFwnc21hbGxcXCd9fVxcXCIgbWF4LWhlaWdodD1cXFwibWF4SGVpZ2h0XFxcIiBtYXgtd2lkdGg9XFxcIm1heFdpZHRoXFxcIiBvdmVyZmxvdz1cXFwib3ZlcmZsb3dcXFwiIHByaW9yaXR5PVxcXCJwcmlvcml0eVxcXCIgcmVzY2FsZT1cXFwicmVzY2FsZVxcXCIgdGh1bWJuYWlsPVxcXCJ0aHVtYm5haWxcXFwiIHRvb2x0aXA9XFxcInRvb2x0aXBcXFwiPjwvdmwtcGxvdD48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJ2bHBsb3Rncm91cC92bHBsb3Rncm91cHBvcHVwLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImRyb3AtY29udGFpbmVyXFxcIj48ZGl2IGNsYXNzPVxcXCJwb3B1cC1tZW51IHBvcHVwLWNvbW1hbmQgbm8tc2hyaW5rIGRldi10b29sXFxcIj48ZGl2IGNsYXNzPVxcXCJjb21tYW5kIGRlYnVnXFxcIj48c3BhbiBjbGFzcz1cXFwiZGVidWdcXFwiPlZsczwvc3Bhbj4gPGEgY2xhc3M9XFxcImRlYnVnXFxcIiB1aS16ZXJvY2xpcD1cXFwiXFxcIiB6ZXJvY2xpcC1jb3BpZWQ9XFxcInNoQ29waWVkPVxcJyhDb3BpZWQpXFwnXFxcIiB6ZXJvY2xpcC1tb2RlbD1cXFwiY2hhcnQuc2hvcnRoYW5kXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVkwgc2hvcnRoYW5kXFwnLCBjaGFydC5zaG9ydGhhbmQpOyBzaENvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3tzaENvcGllZH19PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+Vmw8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJ2bENvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LmNsZWFuU3BlYyB8IGNvbXBhY3RKU09OXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVmVnYS1MaXRlXFwnLCBjaGFydC5jbGVhblNwZWMpOyB2bENvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2bENvcGllZH19PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+Vmc8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJ2Z0NvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LnZnU3BlYyB8IGNvbXBhY3RKU09OXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVmVnYVxcJywgY2hhcnQudmdTcGVjKTsgdmdDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmdDb3BpZWR9fTwvc3Bhbj48L2Rpdj48YSBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCIgbmctaHJlZj1cXFwie3sge3R5cGU6XFwndmxcXCcsIHNwZWM6IGNoYXJ0LmNsZWFuU3BlY30gfCByZXBvcnRVcmwgfX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5SZXBvcnQgQmFkIFJlbmRlcjwvYT4gPGEgbmctY2xpY2s9XFxcInNob3dGZWF0dXJlPSFzaG93RmVhdHVyZVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPnt7Y2hhcnQuc2NvcmV9fTwvYT48ZGl2IG5nLXJlcGVhdD1cXFwiZiBpbiBjaGFydC5zY29yZUZlYXR1cmVzIHRyYWNrIGJ5IGYucmVhc29uXFxcIj5be3tmLnNjb3JlfX1dIHt7Zi5yZWFzb259fTwvZGl2PjwvZGl2PjwvZGl2PlwiKTt9XSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FsZXJ0TWVzc2FnZXMnLCBmdW5jdGlvbihBbGVydHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdhbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuQWxlcnRzID0gQWxlcnRzO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgLy8gVGhlIGJvb2ttYXJrIGxpc3QgaXMgZGVzaWduZWQgdG8gcmVuZGVyIHdpdGhpbiBhIG1vZGFsIG92ZXJsYXkuXG4gICAgICAgIC8vIEJlY2F1c2UgbW9kYWwgY29udGVudHMgYXJlIGhpZGRlbiB2aWEgbmctaWYsIGlmIHRoaXMgbGluayBmdW5jdGlvbiBpc1xuICAgICAgICAvLyBleGVjdXRpbmcgaXQgaXMgYmVjYXVzZSB0aGUgZGlyZWN0aXZlIGlzIGJlaW5nIHNob3duLiBMb2cgdGhlIGV2ZW50OlxuICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfT1BFTik7XG4gICAgICAgIHNjb3BlLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19DTE9TRSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuQm9va21hcmtzID0gQm9va21hcmtzO1xuICAgICAgICBzY29wZS5jb25zdHMgPSBjb25zdHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICB0aGlzLmlzU3VwcG9ydGVkID0gbG9jYWxTdG9yYWdlU2VydmljZS5pc1N1cHBvcnRlZDtcbiAgICB9O1xuXG4gICAgdmFyIHByb3RvID0gQm9va21hcmtzLnByb3RvdHlwZTtcblxuICAgIHByb3RvLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5sZW5ndGggPSBPYmplY3Qua2V5cyh0aGlzLmRpY3QpLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgcHJvdG8uc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZS5zZXQoJ2Jvb2ttYXJrcycsIHRoaXMuZGljdCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZGljdCA9IGxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KCdib29rbWFya3MnKSB8fCB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMudXBkYXRlTGVuZ3RoKCk7XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8udG9nZ2xlID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgIHZhciBzaG9ydGhhbmQgPSBjaGFydC5zaG9ydGhhbmQ7XG5cbiAgICAgIGlmICh0aGlzLmRpY3Rbc2hvcnRoYW5kXSkge1xuICAgICAgICB0aGlzLnJlbW92ZShjaGFydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFkZChjaGFydCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHByb3RvLmFkZCA9IGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICB2YXIgc2hvcnRoYW5kID0gY2hhcnQuc2hvcnRoYW5kO1xuXG4gICAgICBjb25zb2xlLmxvZygnYWRkaW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBjaGFydC50aW1lQWRkZWQgPSAobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xuXG4gICAgICBjaGFydC5zdGF0cyA9IERhdGFzZXQuc3RhdHM7XG5cbiAgICAgIHRoaXMuZGljdFtzaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoY2hhcnQpO1xuICAgICAgdGhpcy51cGRhdGVMZW5ndGgoKTtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfQURELCBzaG9ydGhhbmQpO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgY29uc29sZS5sb2coJ3JlbW92aW5nJywgY2hhcnQudmxTcGVjLCBzaG9ydGhhbmQpO1xuXG4gICAgICBkZWxldGUgdGhpcy5kaWN0W3Nob3J0aGFuZF07XG4gICAgICB0aGlzLnVwZGF0ZUxlbmd0aCgpO1xuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19SRU1PVkUsIHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmlzQm9va21hcmtlZCA9IGZ1bmN0aW9uKHNob3J0aGFuZCkge1xuICAgICAgcmV0dXJuIHNob3J0aGFuZCBpbiB0aGlzLmRpY3Q7XG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgQm9va21hcmtzKCk7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZXJ2aWNlIGZvciB0aGUgc3BlYyBjb25maWcuXG4vLyBXZSBrZWVwIHRoaXMgc2VwYXJhdGUgc28gdGhhdCBjaGFuZ2VzIGFyZSBrZXB0IGV2ZW4gaWYgdGhlIHNwZWMgY2hhbmdlcy5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0NvbmZpZycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBDb25maWcgPSB7fTtcblxuICAgIENvbmZpZy5kYXRhID0ge307XG4gICAgQ29uZmlnLmNvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLmdldENvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH07XG5cbiAgICBDb25maWcuZ2V0RGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIENvbmZpZy5kYXRhO1xuICAgIH07XG5cbiAgICBDb25maWcubGFyZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNlbGw6IHtcbiAgICAgICAgICB3aWR0aDogNDAwLFxuICAgICAgICAgIGhlaWdodDogNDAwXG4gICAgICAgIH0sXG4gICAgICAgIGZhY2V0OiB7XG4gICAgICAgICAgY2VsbDoge1xuICAgICAgICAgICAgd2lkdGg6IDIwMCxcbiAgICAgICAgICAgIGhlaWdodDogMjAwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBDb25maWcuc21hbGwgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZhY2V0OiB7XG4gICAgICAgICAgY2VsbDoge1xuICAgICAgICAgICAgd2lkdGg6IDE1MCxcbiAgICAgICAgICAgIGhlaWdodDogMTUwXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBDb25maWcudXBkYXRlRGF0YXNldCA9IGZ1bmN0aW9uKGRhdGFzZXQsIHR5cGUpIHtcbiAgICAgIGlmIChkYXRhc2V0LnZhbHVlcykge1xuICAgICAgICBDb25maWcuZGF0YS52YWx1ZXMgPSBkYXRhc2V0LnZhbHVlcztcbiAgICAgICAgZGVsZXRlIENvbmZpZy5kYXRhLnVybDtcbiAgICAgICAgQ29uZmlnLmRhdGEuZm9ybWF0VHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIENvbmZpZy5kYXRhLnVybCA9IGRhdGFzZXQudXJsO1xuICAgICAgICBkZWxldGUgQ29uZmlnLmRhdGEudmFsdWVzO1xuICAgICAgICBDb25maWcuZGF0YS5mb3JtYXRUeXBlID0gdHlwZTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIENvbmZpZztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmllbGRJbmZvXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmllbGRJbmZvXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZmllbGRJbmZvJywgZnVuY3Rpb24gKERhdGFzZXQsIERyb3AsIHZsLCBjb25zdHMsIF8pIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdmaWVsZGluZm8vZmllbGRpbmZvLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBmaWVsZERlZjogJz0nLFxuICAgICAgICBzaG93VHlwZTogJz0nLFxuICAgICAgICBzaG93SW5mbzogJz0nLFxuICAgICAgICBzaG93Q2FyZXQ6ICc9JyxcbiAgICAgICAgcG9wdXBDb250ZW50OiAnPScsXG4gICAgICAgIHNob3dSZW1vdmU6ICc9JyxcbiAgICAgICAgcmVtb3ZlQWN0aW9uOiAnJicsXG4gICAgICAgIGFjdGlvbjogJyYnLFxuICAgICAgICBkaXNhYmxlQ291bnRDYXJldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIGZ1bmNzUG9wdXA7XG4gICAgICAgIHNjb3BlLnZsVHlwZSA9IHZsLnR5cGU7XG4gICAgICAgIHNjb3BlLnR5cGVOYW1lcyA9IGNvbnN0cy50eXBlTmFtZXM7XG4gICAgICAgIHNjb3BlLnN0YXRzID0gRGF0YXNldC5zdGF0c1tzY29wZS5maWVsZERlZi5maWVsZF07XG4gICAgICAgIHNjb3BlLmNvbnRhaW5zVHlwZSA9IGZ1bmN0aW9uKHR5cGVzLCB0eXBlKSB7XG4gICAgICAgICAgcmV0dXJuIF8uaW5jbHVkZXModHlwZXMsIHR5cGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHN3aXRjaChzY29wZS5maWVsZERlZi50eXBlKXtcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuT1JESU5BTDpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtZm9udCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuTk9NSU5BTDpcbiAgICAgICAgICAgIHNjb3BlLmljb24gPSAnZmEtZm9udCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIHZsLnR5cGUuUVVBTlRJVEFUSVZFOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdpY29uLWhhc2gnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSB2bC50eXBlLlRFTVBPUkFMOlxuICAgICAgICAgICAgc2NvcGUuaWNvbiA9ICdmYS1jYWxlbmRhcic7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHNjb3BlLmNsaWNrZWQgPSBmdW5jdGlvbigkZXZlbnQpe1xuICAgICAgICAgIGlmKHNjb3BlLmFjdGlvbiAmJiAkZXZlbnQudGFyZ2V0ICE9PSBlbGVtZW50LmZpbmQoJy5mYS1jYXJldC1kb3duJylbMF0gJiZcbiAgICAgICAgICAgICRldmVudC50YXJnZXQgIT09IGVsZW1lbnQuZmluZCgnc3Bhbi50eXBlJylbMF0pIHtcbiAgICAgICAgICAgIHNjb3BlLmFjdGlvbigkZXZlbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5mdW5jID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICByZXR1cm4gZmllbGREZWYuYWdncmVnYXRlIHx8IGZpZWxkRGVmLnRpbWVVbml0IHx8XG4gICAgICAgICAgICAoZmllbGREZWYuYmluICYmICdiaW4nKSB8fFxuICAgICAgICAgICAgZmllbGREZWYuX2FnZ3JlZ2F0ZSB8fCBmaWVsZERlZi5fdGltZVVuaXQgfHxcbiAgICAgICAgICAgIChmaWVsZERlZi5fYmluICYmICdiaW4nKSB8fCAoZmllbGREZWYuX2FueSAmJiAnYXV0bycpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiR3YXRjaCgncG9wdXBDb250ZW50JywgZnVuY3Rpb24ocG9wdXBDb250ZW50KSB7XG4gICAgICAgICAgaWYgKCFwb3B1cENvbnRlbnQpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCkge1xuICAgICAgICAgICAgZnVuY3NQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZnVuY3NQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IHBvcHVwQ29udGVudCxcbiAgICAgICAgICAgIHRhcmdldDogZWxlbWVudC5maW5kKCcudHlwZS1jYXJldCcpWzBdLFxuICAgICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgICBvcGVuT246ICdjbGljaydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChmdW5jc1BvcHVwKSB7XG4gICAgICAgICAgICBmdW5jc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZE15cmlhRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGFkZE15cmlhRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZE15cmlhRGF0YXNldCcsIGZ1bmN0aW9uICgkaHR0cCwgRGF0YXNldCwgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2NvcGUgdmFyaWFibGVzXG4gICAgICAgIHNjb3BlLm15cmlhUmVzdFVybCA9IGNvbnN0cy5teXJpYVJlc3Q7XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldHMgPSBbXTtcbiAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0ID0gbnVsbDtcblxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMgPSBmdW5jdGlvbihxdWVyeSkge1xuICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoc2NvcGUubXlyaWFSZXN0VXJsICsgJy9kYXRhc2V0L3NlYXJjaC8/cT0nICsgcXVlcnkpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIExvYWQgdGhlIGF2YWlsYWJsZSBkYXRhc2V0cyBmcm9tIE15cmlhXG4gICAgICAgIHNjb3BlLmxvYWREYXRhc2V0cygnJyk7XG5cbiAgICAgICAgc2NvcGUub3B0aW9uTmFtZSA9IGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC51c2VyTmFtZSArICc6JyArIGRhdGFzZXQucHJvZ3JhbU5hbWUgKyAnOicgKyBkYXRhc2V0LnJlbGF0aW9uTmFtZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGREYXRhc2V0ID0gZnVuY3Rpb24obXlyaWFEYXRhc2V0KSB7XG4gICAgICAgICAgdmFyIGRhdGFzZXQgPSB7XG4gICAgICAgICAgICBncm91cDogJ215cmlhJyxcbiAgICAgICAgICAgIG5hbWU6IG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUsXG4gICAgICAgICAgICB1cmw6IHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC91c2VyLScgKyBteXJpYURhdGFzZXQudXNlck5hbWUgK1xuICAgICAgICAgICAgICAnL3Byb2dyYW0tJyArIG15cmlhRGF0YXNldC5wcm9ncmFtTmFtZSArXG4gICAgICAgICAgICAgICcvcmVsYXRpb24tJyArIG15cmlhRGF0YXNldC5yZWxhdGlvbk5hbWUgKyAnL2RhdGE/Zm9ybWF0PWpzb24nXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIERhdGFzZXQudHlwZSA9ICdqc29uJztcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChkYXRhc2V0KTtcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmFkZFVybERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRVcmxEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYWRkVXJsRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2FkZHVybGRhdGFzZXQuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJz9eXm1vZGFsJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZTogdHJ1ZSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIC8vIElmIHRoaXMgZGlyZWN0aXZlIG9jY3VycyB3aXRoaW4gYSBhIG1vZGFsLCBnaXZlIG91cnNlbHZlcyBhIHdheSB0byBjbG9zZVxuICAgICAgICAvLyB0aGF0IG1vZGFsIG9uY2UgdGhlIGFkZCBidXR0b24gaGFzIGJlZW4gY2xpY2tlZFxuICAgICAgICBmdW5jdGlvbiBjbG9zZU1vZGFsKCkge1xuICAgICAgICAgIGlmIChtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIG1vZGFsQ29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRoZSBkYXRhc2V0IHRvIGFkZFxuICAgICAgICBzY29wZS5hZGRlZERhdGFzZXQgPSB7XG4gICAgICAgICAgZ3JvdXA6ICd1c2VyJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZEZyb21VcmwgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1VSTCwgZGF0YXNldC51cmwpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBGZXRjaCAmIGFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6aW5Hcm91cFxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgaW5Hcm91cFxuICogR2V0IGRhdGFzZXRzIGluIGEgcGFydGljdWxhciBncm91cFxuICogQHBhcmFtICB7U3RyaW5nfSBkYXRhc2V0R3JvdXAgT25lIG9mIFwic2FtcGxlLFwiIFwidXNlclwiLCBvciBcIm15cmlhXCJcbiAqIEByZXR1cm4ge0FycmF5fSBBbiBhcnJheSBvZiBkYXRhc2V0cyBpbiB0aGUgc3BlY2lmaWVkIGdyb3VwXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcignaW5Hcm91cCcsIGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oYXJyLCBkYXRhc2V0R3JvdXApIHtcbiAgICAgIHJldHVybiBfLndoZXJlKGFyciwge1xuICAgICAgICBncm91cDogZGF0YXNldEdyb3VwXG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgY2hhbmdlTG9hZGVkRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2NoYW5nZUxvYWRlZERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvY2hhbmdlbG9hZGVkZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhwb3NlIGRhdGFzZXQgb2JqZWN0IGl0c2VsZiBzbyBjdXJyZW50IGRhdGFzZXQgY2FuIGJlIG1hcmtlZFxuICAgICAgICBzY29wZS5EYXRhc2V0ID0gRGF0YXNldDtcblxuICAgICAgICBzY29wZS51c2VyRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIGZ1bmN0aW9uKGRhdGFzZXQpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNhbXBsZURhdGEgPSBfLndoZXJlKERhdGFzZXQuZGF0YXNldHMsIHtcbiAgICAgICAgICBncm91cDogJ3NhbXBsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBEYXRhc2V0LmRhdGFzZXRzLmxlbmd0aDtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdERhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShkYXRhc2V0KTtcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGdldE5hbWVNYXAoZGF0YXNjaGVtYSkge1xuICByZXR1cm4gZGF0YXNjaGVtYS5yZWR1Y2UoZnVuY3Rpb24obSwgZmllbGREZWYpIHtcbiAgICBtW2ZpZWxkRGVmLmZpZWxkXSA9IGZpZWxkRGVmO1xuICAgIHJldHVybiBtO1xuICB9LCB7fSk7XG59XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0RhdGFzZXQnLCBmdW5jdGlvbigkaHR0cCwgJHEsIEFsZXJ0cywgXywgZGwsIHZsLCBTYW1wbGVEYXRhLCBDb25maWcsIExvZ2dlcikge1xuICAgIHZhciBEYXRhc2V0ID0ge307XG5cbiAgICAvLyBTdGFydCB3aXRoIHRoZSBsaXN0IG9mIHNhbXBsZSBkYXRhc2V0c1xuICAgIHZhciBkYXRhc2V0cyA9IFNhbXBsZURhdGE7XG5cbiAgICBEYXRhc2V0LmRhdGFzZXRzID0gZGF0YXNldHM7XG4gICAgRGF0YXNldC5kYXRhc2V0ID0gZGF0YXNldHNbMV07XG4gICAgRGF0YXNldC5jdXJyZW50RGF0YXNldCA9IHVuZGVmaW5lZDsgIC8vIGRhdGFzZXQgYmVmb3JlIHVwZGF0ZVxuICAgIERhdGFzZXQuZGF0YXNjaGVtYSA9IFtdO1xuICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSB7fTtcbiAgICBEYXRhc2V0LnN0YXRzID0ge307XG4gICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuXG4gICAgdmFyIHR5cGVPcmRlciA9IHtcbiAgICAgIG5vbWluYWw6IDAsXG4gICAgICBvcmRpbmFsOiAwLFxuICAgICAgZ2VvZ3JhcGhpYzogMixcbiAgICAgIHRlbXBvcmFsOiAzLFxuICAgICAgcXVhbnRpdGF0aXZlOiA0XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5ID0ge307XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIGlmIChmaWVsZERlZi5hZ2dyZWdhdGU9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgICAgIHJldHVybiB0eXBlT3JkZXJbZmllbGREZWYudHlwZV07XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZShmaWVsZERlZikgKyAnXycgK1xuICAgICAgICAoZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnID8gJ34nIDogZmllbGREZWYuZmllbGQudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIC8vIH4gaXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIEFTQ0lJXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm9yaWdpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIHJldHVybiBmaWVsZERlZi5maWVsZDtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyQnkuY2FyZGluYWxpdHkgPSBmdW5jdGlvbihmaWVsZERlZiwgc3RhdHMpIHtcbiAgICAgIHJldHVybiBzdGF0c1tmaWVsZERlZi5maWVsZF0uZGlzdGluY3Q7XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlciA9IERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZTtcblxuICAgIERhdGFzZXQuZ2V0U2NoZW1hID0gZnVuY3Rpb24oZGF0YSwgc3RhdHMsIG9yZGVyKSB7XG4gICAgICB2YXIgdHlwZXMgPSBkbC50eXBlLmluZmVyQWxsKGRhdGEpLFxuICAgICAgICBzY2hlbWEgPSBfLnJlZHVjZSh0eXBlcywgZnVuY3Rpb24ocywgdHlwZSwgZmllbGQpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGQsXG4gICAgICAgICAgICB0eXBlOiB2bC5kYXRhLnR5cGVzW3R5cGVdLFxuICAgICAgICAgICAgcHJpbWl0aXZlVHlwZTogdHlwZVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAoZmllbGREZWYudHlwZSA9PT0gdmwudHlwZS5RVUFOVElUQVRJVkUgJiYgc3RhdHNbZmllbGREZWYuZmllbGRdLmRpc3RpbmN0IDw9IDUpIHtcbiAgICAgICAgICAgIGZpZWxkRGVmLnR5cGUgPSB2bC50eXBlLk9SRElOQUw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcy5wdXNoKGZpZWxkRGVmKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSwgW10pO1xuXG4gICAgICBzY2hlbWEgPSBkbC5zdGFibGVzb3J0KHNjaGVtYSwgb3JkZXIgfHwgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lLCBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCk7XG5cbiAgICAgIHNjaGVtYS5wdXNoKHZsLmZpZWxkRGVmLmNvdW50KCkpO1xuICAgICAgcmV0dXJuIHNjaGVtYTtcbiAgICB9O1xuXG4gICAgLy8gdXBkYXRlIHRoZSBzY2hlbWEgYW5kIHN0YXRzXG4gICAgRGF0YXNldC5vblVwZGF0ZSA9IFtdO1xuXG4gICAgRGF0YXNldC51cGRhdGUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICB2YXIgdXBkYXRlUHJvbWlzZTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfQ0hBTkdFLCBkYXRhc2V0Lm5hbWUpO1xuXG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhc2V0LnZhbHVlcyk7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHVwZGF0ZVByb21pc2UgPSAkaHR0cC5nZXQoZGF0YXNldC51cmwsIHtjYWNoZTogdHJ1ZX0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICB2YXIgZGF0YTtcblxuICAgICAgICAgIC8vIGZpcnN0IHNlZSB3aGV0aGVyIHRoZSBkYXRhIGlzIEpTT04sIG90aGVyd2lzZSB0cnkgdG8gcGFyc2UgQ1NWXG4gICAgICAgICAgaWYgKF8uaXNPYmplY3QocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBkbC5yZWFkKHJlc3BvbnNlLmRhdGEsIHt0eXBlOiAnY3N2J30pO1xuICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2Nzdic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YShkYXRhc2V0LCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIERhdGFzZXQub25VcGRhdGUuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gdXBkYXRlUHJvbWlzZS50aGVuKGxpc3RlbmVyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDb3B5IHRoZSBkYXRhc2V0IGludG8gdGhlIGNvbmZpZyBzZXJ2aWNlIG9uY2UgaXQgaXMgcmVhZHlcbiAgICAgIHVwZGF0ZVByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgQ29uZmlnLnVwZGF0ZURhdGFzZXQoZGF0YXNldCwgRGF0YXNldC50eXBlKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdXBkYXRlUHJvbWlzZTtcbiAgICB9O1xuXG4gICAgRGF0YXNldC51cGRhdGVGcm9tRGF0YSA9IGZ1bmN0aW9uKGRhdGFzZXQsIGRhdGEpIHtcbiAgICAgIERhdGFzZXQuZGF0YSA9IGRhdGE7XG5cbiAgICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSBkYXRhc2V0O1xuICAgICAgRGF0YXNldC5zdGF0cyA9IGRsLnN1bW1hcnkoZGF0YSkucmVkdWNlKGZ1bmN0aW9uKHMsIHByb2ZpbGUpIHtcbiAgICAgICAgc1twcm9maWxlLmZpZWxkXSA9IHByb2ZpbGU7XG4gICAgICAgIHJldHVybiBzO1xuICAgICAgfSwge1xuICAgICAgICAnKic6IHtcbiAgICAgICAgICBtYXg6IGRhdGEubGVuZ3RoLFxuICAgICAgICAgIG1pbjogMFxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZm9yICh2YXIgZmllbGROYW1lIGluIERhdGFzZXQuc3RhdHMpIHtcbiAgICAgICAgaWYgKGZpZWxkTmFtZSAhPT0gJyonKSB7XG4gICAgICAgICAgRGF0YXNldC5zdGF0c1tmaWVsZE5hbWVdLnNhbXBsZSA9IF8uc2FtcGxlKF8ubWFwKERhdGFzZXQuZGF0YSwgZmllbGROYW1lKSwgNyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgRGF0YXNldC5kYXRhc2NoZW1hID0gRGF0YXNldC5nZXRTY2hlbWEoRGF0YXNldC5kYXRhLCBEYXRhc2V0LnN0YXRzKTtcbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYS5ieU5hbWUgPSBnZXROYW1lTWFwKERhdGFzZXQuZGF0YXNjaGVtYSk7XG4gICAgfTtcblxuICAgIERhdGFzZXQuYWRkID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgaWYgKCFkYXRhc2V0LmlkKSB7XG4gICAgICAgIGRhdGFzZXQuaWQgPSBkYXRhc2V0LnVybDtcbiAgICAgIH1cbiAgICAgIGRhdGFzZXRzLnB1c2goZGF0YXNldCk7XG5cbiAgICAgIHJldHVybiBkYXRhc2V0O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF0YXNldDtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZGF0YXNldE1vZGFsXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZGF0YXNldE1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldE1vZGFsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiBmYWxzZVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2RhdGFzZXRTZWxlY3RvcicsIGZ1bmN0aW9uKE1vZGFscywgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7fSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuREFUQVNFVF9PUEVOKTtcbiAgICAgICAgICBNb2RhbHMub3BlbignZGF0YXNldC1tb2RhbCcpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpbGVEcm9wem9uZVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpbGVEcm9wem9uZVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC8vIEFkZCB0aGUgZmlsZSByZWFkZXIgYXMgYSBuYW1lZCBkZXBlbmRlbmN5XG4gIC5jb25zdGFudCgnRmlsZVJlYWRlcicsIHdpbmRvdy5GaWxlUmVhZGVyKVxuICAuZGlyZWN0aXZlKCdmaWxlRHJvcHpvbmUnLCBmdW5jdGlvbiAoTW9kYWxzLCBBbGVydHMsIEZpbGVSZWFkZXIpIHtcblxuICAgIC8vIEhlbHBlciBtZXRob2RzXG5cbiAgICBmdW5jdGlvbiBpc1NpemVWYWxpZChzaXplLCBtYXhTaXplKSB7XG4gICAgICAvLyBTaXplIGlzIHByb3ZpZGVkIGluIGJ5dGVzOyBtYXhTaXplIGlzIHByb3ZpZGVkIGluIG1lZ2FieXRlc1xuICAgICAgLy8gQ29lcmNlIG1heFNpemUgdG8gYSBudW1iZXIgaW4gY2FzZSBpdCBjb21lcyBpbiBhcyBhIHN0cmluZyxcbiAgICAgIC8vICYgcmV0dXJuIHRydWUgd2hlbiBtYXggZmlsZSBzaXplIHdhcyBub3Qgc3BlY2lmaWVkLCBpcyBlbXB0eSxcbiAgICAgIC8vIG9yIGlzIHN1ZmZpY2llbnRseSBsYXJnZVxuICAgICAgcmV0dXJuICFtYXhTaXplIHx8ICggc2l6ZSAvIDEwMjQgLyAxMDI0IDwgK21heFNpemUgKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1R5cGVWYWxpZCh0eXBlLCB2YWxpZE1pbWVUeXBlcykge1xuICAgICAgICAvLyBJZiBubyBtaW1lIHR5cGUgcmVzdHJpY3Rpb25zIHdlcmUgcHJvdmlkZWQsIG9yIHRoZSBwcm92aWRlZCBmaWxlJ3NcbiAgICAgICAgLy8gdHlwZSBpcyB3aGl0ZWxpc3RlZCwgdHlwZSBpcyB2YWxpZFxuICAgICAgcmV0dXJuICF2YWxpZE1pbWVUeXBlcyB8fCAoIHZhbGlkTWltZVR5cGVzLmluZGV4T2YodHlwZSkgPiAtMSApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvZmlsZWRyb3B6b25lLmh0bWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAvLyBQZXJtaXQgYXJiaXRyYXJ5IGNoaWxkIGNvbnRlbnRcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBtYXhGaWxlU2l6ZTogJ0AnLFxuICAgICAgICB2YWxpZE1pbWVUeXBlczogJ0AnLFxuICAgICAgICAvLyBFeHBvc2UgdGhpcyBkaXJlY3RpdmUncyBkYXRhc2V0IHByb3BlcnR5IHRvIHBhcmVudCBzY29wZXMgdGhyb3VnaFxuICAgICAgICAvLyB0d28td2F5IGRhdGFiaW5kaW5nXG4gICAgICAgIGRhdGFzZXQ6ICc9J1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudC8qLCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmRhdGFzZXQgPSBzY29wZS5kYXRhc2V0IHx8IHt9O1xuXG4gICAgICAgIGVsZW1lbnQub24oJ2RyYWdvdmVyIGRyYWdlbnRlcicsIGZ1bmN0aW9uIG9uRHJhZ0VudGVyKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBldmVudC5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gJ2NvcHknO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiByZWFkRmlsZShmaWxlKSB7XG4gICAgICAgICAgaWYgKCFpc1R5cGVWYWxpZChmaWxlLnR5cGUsIHNjb3BlLnZhbGlkTWltZVR5cGVzKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdJbnZhbGlkIGZpbGUgdHlwZS4gRmlsZSBtdXN0IGJlIG9uZSBvZiBmb2xsb3dpbmcgdHlwZXM6ICcgKyBzY29wZS52YWxpZE1pbWVUeXBlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpc1NpemVWYWxpZChmaWxlLnNpemUsIHNjb3BlLm1heEZpbGVTaXplKSkge1xuICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBBbGVydHMuYWRkKCdGaWxlIG11c3QgYmUgc21hbGxlciB0aGFuICcgKyBzY29wZS5tYXhGaWxlU2l6ZSArICcgTUInKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxuICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICAgIHJldHVybiBzY29wZS4kYXBwbHkoZnVuY3Rpb24oc2NvcGUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5kYXRhID0gZXZ0LnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgIC8vIFN0cmlwIGZpbGUgbmFtZSBleHRlbnNpb25zIGZyb20gdGhlIHVwbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgc2NvcGUuZGF0YXNldC5uYW1lID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlxcdyskLywgJycpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBBbGVydHMuYWRkKCdFcnJvciByZWFkaW5nIGZpbGUnKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50Lm9uKCdkcm9wJywgZnVuY3Rpb24gb25Ecm9wKGV2ZW50KSB7XG4gICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlYWRGaWxlKGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzWzBdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZWxlbWVudC5maW5kKCdpbnB1dFt0eXBlPVwiZmlsZVwiXScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBvblVwbG9hZCgvKmV2ZW50Ki8pIHtcbiAgICAgICAgICAvLyBcInRoaXNcIiBpcyB0aGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgIHJlYWRGaWxlKHRoaXMuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnBhc3RlRGF0YXNldFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHBhc3RlRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Bhc3RlRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBMb2dnZXIsIENvbmZpZywgXywgZGwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnP15ebW9kYWwnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB0cnVlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBtb2RhbENvbnRyb2xsZXIpIHtcbiAgICAgICAgLy8gSWYgdGhpcyBkaXJlY3RpdmUgb2NjdXJzIHdpdGhpbiBhIGEgbW9kYWwsIGdpdmUgb3Vyc2VsdmVzIGEgd2F5IHRvIGNsb3NlXG4gICAgICAgIC8vIHRoYXQgbW9kYWwgb25jZSB0aGUgYWRkIGJ1dHRvbiBoYXMgYmVlbiBjbGlja2VkXG4gICAgICAgIGZ1bmN0aW9uIGNsb3NlTW9kYWwoKSB7XG4gICAgICAgICAgaWYgKG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAgICAgbW9kYWxDb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzY29wZSB2YXJpYWJsZXNcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHtcbiAgICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgICBkYXRhOiAnJ1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmFkZERhdGFzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGF0YSA9IGRsLnJlYWQoc2NvcGUuZGF0YXNldC5kYXRhLCB7XG4gICAgICAgICAgICB0eXBlOiAnY3N2J1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdmFyIHBhc3RlZERhdGFzZXQgPSB7XG4gICAgICAgICAgICBpZDogRGF0ZS5ub3coKSwgIC8vIHRpbWUgYXMgaWRcbiAgICAgICAgICAgIG5hbWU6IHNjb3BlLmRhdGFzZXQubmFtZSxcbiAgICAgICAgICAgIHZhbHVlczogZGF0YSxcbiAgICAgICAgICAgIGdyb3VwOiAncGFzdGVkJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBMb2cgdGhhdCB3ZSBoYXZlIHBhc3RlZCBkYXRhXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfTkVXX1BBU1RFLCBwYXN0ZWREYXRhc2V0Lm5hbWUpO1xuXG4gICAgICAgICAgLy8gUmVnaXN0ZXIgdGhlIHBhc3RlZCBkYXRhIGFzIGEgbmV3IGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LmRhdGFzZXQgPSBEYXRhc2V0LmFkZChwYXN0ZWREYXRhc2V0KTtcblxuICAgICAgICAgIC8vIEFjdGl2YXRlIHRoZSBuZXdseS1yZWdpc3RlcmVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShEYXRhc2V0LmRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gQ2xvc2UgdGhpcyBkaXJlY3RpdmUncyBjb250YWluaW5nIG1vZGFsXG4gICAgICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ3ZsdWknKS5jb25zdGFudCgnU2FtcGxlRGF0YScsIFt7XG4gIG5hbWU6ICdCYXJsZXknLFxuICBkZXNjcmlwdGlvbjogJ0JhcmxleSB5aWVsZCBieSB2YXJpZXR5IGFjcm9zcyB0aGUgdXBwZXIgbWlkd2VzdCBpbiAxOTMxIGFuZCAxOTMyJyxcbiAgdXJsOiAnZGF0YS9iYXJsZXkuanNvbicsXG4gIGlkOiAnYmFybGV5JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhcnMnLFxuICBkZXNjcmlwdGlvbjogJ0F1dG9tb3RpdmUgc3RhdGlzdGljcyBmb3IgYSB2YXJpZXR5IG9mIGNhciBtb2RlbHMgYmV0d2VlbiAxOTcwICYgMTk4MicsXG4gIHVybDogJ2RhdGEvY2Fycy5qc29uJyxcbiAgaWQ6ICdjYXJzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NyaW1lYScsXG4gIHVybDogJ2RhdGEvY3JpbWVhLmpzb24nLFxuICBpZDogJ2NyaW1lYScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdEcml2aW5nJyxcbiAgdXJsOiAnZGF0YS9kcml2aW5nLmpzb24nLFxuICBpZDogJ2RyaXZpbmcnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSXJpcycsXG4gIHVybDogJ2RhdGEvaXJpcy5qc29uJyxcbiAgaWQ6ICdpcmlzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0pvYnMnLFxuICB1cmw6ICdkYXRhL2pvYnMuanNvbicsXG4gIGlkOiAnam9icycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdQb3B1bGF0aW9uJyxcbiAgdXJsOiAnZGF0YS9wb3B1bGF0aW9uLmpzb24nLFxuICBpZDogJ3BvcHVsYXRpb24nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnTW92aWVzJyxcbiAgdXJsOiAnZGF0YS9tb3ZpZXMuanNvbicsXG4gIGlkOiAnbW92aWVzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0JpcmRzdHJpa2VzJyxcbiAgdXJsOiAnZGF0YS9iaXJkc3RyaWtlcy5qc29uJyxcbiAgaWQ6ICdiaXJkc3RyaWtlcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCdXJ0aW4nLFxuICB1cmw6ICdkYXRhL2J1cnRpbi5qc29uJyxcbiAgaWQ6ICdidXJ0aW4nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FtcGFpZ25zJyxcbiAgdXJsOiAnZGF0YS93ZWJhbGwyNi5qc29uJyxcbiAgaWQ6ICd3ZWJhbGwyNicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkubG9nZ2VyXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbG9nZ2VyXG4gKiBTZXJ2aWNlIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0xvZ2dlcicsIGZ1bmN0aW9uICgkbG9jYXRpb24sICR3aW5kb3csIGNvbnN0cywgQW5hbHl0aWNzKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5sZXZlbHMgPSB7XG4gICAgICBPRkY6IHtpZDonT0ZGJywgcmFuazowfSxcbiAgICAgIFRSQUNFOiB7aWQ6J1RSQUNFJywgcmFuazoxfSxcbiAgICAgIERFQlVHOiB7aWQ6J0RFQlVHJywgcmFuazoyfSxcbiAgICAgIElORk86IHtpZDonSU5GTycsIHJhbms6M30sXG4gICAgICBXQVJOOiB7aWQ6J1dBUk4nLCByYW5rOjR9LFxuICAgICAgRVJST1I6IHtpZDonRVJST1InLCByYW5rOjV9LFxuICAgICAgRkFUQUw6IHtpZDonRkFUQUwnLCByYW5rOjZ9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuYWN0aW9ucyA9IHtcbiAgICAgIC8vIERBVEFcbiAgICAgIElOSVRJQUxJWkU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0lOSVRJQUxJWkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgVU5ETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnVU5ETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFJFRE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1JFRE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX0NIQU5HRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX09QRU46IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1BBU1RFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19QQVNURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1VSTDoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfVVJMJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQk9PS01BUktcbiAgICAgIEJPT0tNQVJLX0FERDoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQUREJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfUkVNT1ZFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19SRU1PVkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19PUEVOOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xPU0U6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xFQVI6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICBDTFVTVEVSX1NFTEVDVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0xVU1RFUl9TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0FEX01PUkU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0xPQURfTU9SRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gRklFTERTXG4gICAgICBGSUVMRFNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUVMRFNfUkVTRVQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX1JFU0VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRlVOQ19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRlVOQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vUE9MRVNUQVJcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBGSUVMRF9EUk9QOiB7Y2F0ZWdvcnk6ICdQT0xFU1RBUicsIGlkOiAnRklFTERfRFJPUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBNQVJLX0NIQU5HRToge2NhdGVnb3J5OiAnUE9MRVNUQVInLCBpZDogJ01BUktfQ0hBTkdFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLkRFQlVHfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oYWN0aW9uLCBsYWJlbCwgZGF0YSkge1xuICAgICAgaWYgKCFjb25zdHMubG9nZ2luZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdmFsdWUgPSBkYXRhID8gZGF0YS52YWx1ZSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmKGFjdGlvbi5sZXZlbC5yYW5rID49IHNlcnZpY2UubGV2ZWxzLklORk8ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgc2VydmljZS5sb2dJbnRlcmFjdGlvbihzZXJ2aWNlLmFjdGlvbnMuSU5JVElBTElaRSwgY29uc3RzLmFwcElkKTtcblxuICAgIHJldHVybiBzZXJ2aWNlO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbFxuICogQGRlc2NyaXB0aW9uXG4gKiAjIG1vZGFsXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnbW9kYWwnLCBmdW5jdGlvbiAoJGRvY3VtZW50LCBNb2RhbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgYXV0b09wZW46ICc9JyxcbiAgICAgICAgbWF4V2lkdGg6ICdAJ1xuICAgICAgfSxcbiAgICAgIC8vIFByb3ZpZGUgYW4gaW50ZXJmYWNlIGZvciBjaGlsZCBkaXJlY3RpdmVzIHRvIGNsb3NlIHRoaXMgbW9kYWxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICB2YXIgbW9kYWxJZCA9IGF0dHJzLmlkO1xuXG4gICAgICAgIGlmIChzY29wZS5tYXhXaWR0aCkge1xuICAgICAgICAgIHNjb3BlLndyYXBwZXJTdHlsZSA9ICdtYXgtd2lkdGg6JyArIHNjb3BlLm1heFdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byBjbG9zZWQgdW5sZXNzIGF1dG9PcGVuIGlzIHNldFxuICAgICAgICBzY29wZS5pc09wZW4gPSBzY29wZS5hdXRvT3BlbjtcblxuICAgICAgICAvLyBjbG9zZSBvbiBlc2NcbiAgICAgICAgZnVuY3Rpb24gZXNjYXBlKGUpIHtcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAyNyAmJiBzY29wZS5pc09wZW4pIHtcbiAgICAgICAgICAgIHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgZXNjYXBlKTtcblxuICAgICAgICAvLyBSZWdpc3RlciB0aGlzIG1vZGFsIHdpdGggdGhlIHNlcnZpY2VcbiAgICAgICAgTW9kYWxzLnJlZ2lzdGVyKG1vZGFsSWQsIHNjb3BlKTtcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIE1vZGFscy5kZXJlZ2lzdGVyKG1vZGFsSWQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbENsb3NlQnV0dG9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxDbG9zZUJ1dHRvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsQ2xvc2VCdXR0b24nLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdtb2RhbC9tb2RhbGNsb3NlYnV0dG9uLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICdeXm1vZGFsJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgICdjbG9zZUNhbGxiYWNrJzogJyZvbkNsb3NlJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIHNjb3BlLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICBpZiAoc2NvcGUuY2xvc2VDYWxsYmFjaykge1xuICAgICAgICAgICAgc2NvcGUuY2xvc2VDYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmx1aS5Nb2RhbHNcbiAqIEBkZXNjcmlwdGlvblxuICogIyBNb2RhbHNcbiAqIFNlcnZpY2UgdXNlZCB0byBjb250cm9sIG1vZGFsIHZpc2liaWxpdHkgZnJvbSBhbnl3aGVyZSBpbiB0aGUgYXBwbGljYXRpb25cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnTW9kYWxzJywgZnVuY3Rpb24gKCRjYWNoZUZhY3RvcnkpIHtcblxuICAgIC8vIFRPRE86IFRoZSB1c2Ugb2Ygc2NvcGUgaGVyZSBhcyB0aGUgbWV0aG9kIGJ5IHdoaWNoIGEgbW9kYWwgZGlyZWN0aXZlXG4gICAgLy8gaXMgcmVnaXN0ZXJlZCBhbmQgY29udHJvbGxlZCBtYXkgbmVlZCB0byBjaGFuZ2UgdG8gc3VwcG9ydCByZXRyaWV2aW5nXG4gICAgLy8gZGF0YSBmcm9tIGEgbW9kYWwgYXMgbWF5IGJlIG5lZWRlZCBpbiAjNzdcbiAgICB2YXIgbW9kYWxzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdtb2RhbHMnKTtcblxuICAgIC8vIFB1YmxpYyBBUElcbiAgICByZXR1cm4ge1xuICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkLCBzY29wZSkge1xuICAgICAgICBpZiAobW9kYWxzQ2FjaGUuZ2V0KGlkKSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Nhbm5vdCByZWdpc3RlciB0d28gbW9kYWxzIHdpdGggaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxzQ2FjaGUucHV0KGlkLCBzY29wZSk7XG4gICAgICB9LFxuXG4gICAgICBkZXJlZ2lzdGVyOiBmdW5jdGlvbihpZCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gT3BlbiBhIG1vZGFsXG4gICAgICBvcGVuOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IHRydWU7XG4gICAgICB9LFxuXG4gICAgICAvLyBDbG9zZSBhIG1vZGFsXG4gICAgICBjbG9zZTogZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgdmFyIG1vZGFsU2NvcGUgPSBtb2RhbHNDYWNoZS5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1vZGFsU2NvcGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdVbnJlZ2lzdGVyZWQgbW9kYWwgaWQgJyArIGlkKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbW9kYWxTY29wZS5pc09wZW4gPSBmYWxzZTtcbiAgICAgIH0sXG5cbiAgICAgIGVtcHR5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgbW9kYWxzQ2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICB9LFxuXG4gICAgICBjb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2RhbHNDYWNoZS5pbmZvKCkuc2l6ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VydmljZSBmb3Igc2VydmluZyBWTCBTY2hlbWFcbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ1NjaGVtYScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBTY2hlbWEgPSB7fTtcblxuICAgIFNjaGVtYS5zY2hlbWEgPSB3aW5kb3cudmxTY2hlbWE7XG5cbiAgICBTY2hlbWEuZ2V0Q2hhbm5lbFNjaGVtYSA9IGZ1bmN0aW9uKGNoYW5uZWwpIHtcbiAgICAgIHZhciBlbmNvZGluZ0NoYW5uZWxQcm9wID0gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9ucy5FbmNvZGluZy5wcm9wZXJ0aWVzW2NoYW5uZWxdO1xuICAgICAgdmFyIHJlZiA9IGVuY29kaW5nQ2hhbm5lbFByb3AuJHJlZiB8fCBlbmNvZGluZ0NoYW5uZWxQcm9wLm9uZU9mWzBdLiRyZWY7XG4gICAgICB2YXIgZGVmID0gcmVmLnNsaWNlKHJlZi5sYXN0SW5kZXhPZignLycpKzEpO1xuICAgICAgcmV0dXJuIFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnNbZGVmXTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjaGVtYTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6dGFiXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdGFiXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndGFiJywgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAndGFicy90YWIuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15edGFic2V0JyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaGVhZGluZzogJ0AnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCB0YWJzZXRDb250cm9sbGVyKSB7XG4gICAgICAgIHRhYnNldENvbnRyb2xsZXIuYWRkVGFiKHNjb3BlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTp0YWJzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyB0YWJzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd0YWJzZXQnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICd0YWJzL3RhYnNldC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuXG4gICAgICAvLyBJbnRlcmZhY2UgZm9yIHRhYnMgdG8gcmVnaXN0ZXIgdGhlbXNlbHZlc1xuICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRhYnMgPSBbXTtcblxuICAgICAgICB0aGlzLmFkZFRhYiA9IGZ1bmN0aW9uKHRhYlNjb3BlKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdGFiIGlzIGFsd2F5cyBhdXRvLWFjdGl2YXRlZDsgb3RoZXJzIGF1dG8tZGVhY3RpdmF0ZWRcbiAgICAgICAgICB0YWJTY29wZS5hY3RpdmUgPSBzZWxmLnRhYnMubGVuZ3RoID09PSAwO1xuICAgICAgICAgIHNlbGYudGFicy5wdXNoKHRhYlNjb3BlKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNob3dUYWIgPSBmdW5jdGlvbihzZWxlY3RlZFRhYikge1xuICAgICAgICAgIHNlbGYudGFicy5mb3JFYWNoKGZ1bmN0aW9uKHRhYikge1xuICAgICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIHRhYiwgZGVhY3RpdmF0ZSBhbGwgb3RoZXJzXG4gICAgICAgICAgICB0YWIuYWN0aXZlID0gdGFiID09PSBzZWxlY3RlZFRhYjtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIEV4cG9zZSBjb250cm9sbGVyIHRvIHRlbXBsYXRlcyBhcyBcInRhYnNldFwiXG4gICAgICBjb250cm9sbGVyQXM6ICd0YWJzZXQnXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90JywgZnVuY3Rpb24oZGwsIHZsLCB2ZywgJHRpbWVvdXQsICRxLCBEYXRhc2V0LCBDb25maWcsIGNvbnN0cywgXywgJGRvY3VtZW50LCBMb2dnZXIsIEhlYXAsICR3aW5kb3cpIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIE1BWF9DQU5WQVNfU0laRSA9IDMyNzY3LzIsIE1BWF9DQU5WQVNfQVJFQSA9IDI2ODQzNTQ1Ni80O1xuXG4gICAgdmFyIHJlbmRlclF1ZXVlID0gbmV3IEhlYXAoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIHJldHVybiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eTtcbiAgICAgIH0pLFxuICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBnZXRSZW5kZXJlcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAvLyB1c2UgY2FudmFzIGJ5IGRlZmF1bHQgYnV0IHVzZSBzdmcgaWYgdGhlIHZpc3VhbGl6YXRpb24gaXMgdG9vIGJpZ1xuICAgICAgaWYgKHdpZHRoID4gTUFYX0NBTlZBU19TSVpFIHx8IGhlaWdodCA+IE1BWF9DQU5WQVNfU0laRSB8fCB3aWR0aCpoZWlnaHQgPiBNQVhfQ0FOVkFTX0FSRUEpIHtcbiAgICAgICAgcmV0dXJuICdzdmcnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdjYW52YXMnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdC92bHBsb3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhcnQ6ICc9JyxcblxuICAgICAgICAvL29wdGlvbmFsXG4gICAgICAgIGRpc2FibGVkOiAnPScsXG4gICAgICAgIGlzSW5MaXN0OiAnPScsXG5cbiAgICAgICAgYWx3YXlzU2Nyb2xsYWJsZTogJz0nLFxuICAgICAgICBjb25maWdTZXQ6ICdAJyxcbiAgICAgICAgbWF4SGVpZ2h0Oic9JyxcbiAgICAgICAgbWF4V2lkdGg6ICc9JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc9JyxcbiAgICAgICAgcHJpb3JpdHk6ICc9JyxcbiAgICAgICAgcmVzY2FsZTogJz0nLFxuICAgICAgICB0aHVtYm5haWw6ICc9JyxcbiAgICAgICAgdG9vbHRpcDogJz0nLFxuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgSE9WRVJfVElNRU9VVCA9IDUwMCxcbiAgICAgICAgICBUT09MVElQX1RJTUVPVVQgPSAyNTA7XG5cbiAgICAgICAgc2NvcGUudmlzSWQgPSAoY291bnRlcisrKTtcbiAgICAgICAgc2NvcGUuaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgc2NvcGUudG9vbHRpcFByb21pc2UgPSBudWxsO1xuICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIGZvcm1hdCA9IGRsLmZvcm1hdC5udW1iZXIoJycpO1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3ZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLmhvdmVyUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQ0hBUlRfTU9VU0VPVkVSLCAnJywgc2NvcGUuY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSAhc2NvcGUudGh1bWJuYWlsO1xuICAgICAgICAgIH0sIEhPVkVSX1RJTUVPVVQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLm1vdXNlb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgJycsIHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHNjb3BlLmhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IHNjb3BlLnVubG9ja2VkID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gdmlld09uTW91c2VPdmVyKGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgaWYgKCFpdGVtIHx8ICFpdGVtLmRhdHVtKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgc2NvcGUudG9vbHRpcFByb21pc2UgPSAkdGltZW91dChmdW5jdGlvbiBhY3RpdmF0ZVRvb2x0aXAoKXtcblxuICAgICAgICAgICAgLy8gYXZvaWQgc2hvd2luZyB0b29sdGlwIGZvciBmYWNldCdzIGJhY2tncm91bmRcbiAgICAgICAgICAgIGlmIChpdGVtLmRhdHVtLl9mYWNldElEKSByZXR1cm47XG5cbiAgICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVAsIGl0ZW0uZGF0dW0pO1xuXG5cbiAgICAgICAgICAgIC8vIGNvbnZlcnQgZGF0YSBpbnRvIGEgZm9ybWF0IHRoYXQgd2UgY2FuIGVhc2lseSB1c2Ugd2l0aCBuZyB0YWJsZSBhbmQgbmctcmVwZWF0XG4gICAgICAgICAgICAvLyBUT0RPOiByZXZpc2UgaWYgdGhpcyBpcyBhY3R1YWxseSBhIGdvb2QgaWRlYVxuICAgICAgICAgICAgc2NvcGUuZGF0YSA9IF8oaXRlbS5kYXR1bSkub21pdCgnX3ByZXYnLCAnX2lkJykgLy8gb21pdCB2ZWdhIGludGVybmFsc1xuICAgICAgICAgICAgICAucGFpcnMoKS52YWx1ZSgpXG4gICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocCkge1xuICAgICAgICAgICAgICAgIHBbMV0gPSBkbC5pc051bWJlcihwWzFdKSA/IGZvcm1hdChwWzFdKSA6IHBbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuXG4gICAgICAgICAgICB2YXIgdG9vbHRpcCA9IGVsZW1lbnQuZmluZCgnLnZpcy10b29sdGlwJyksXG4gICAgICAgICAgICAgICRib2R5ID0gYW5ndWxhci5lbGVtZW50KCRkb2N1bWVudCksXG4gICAgICAgICAgICAgIHdpZHRoID0gdG9vbHRpcC53aWR0aCgpLFxuICAgICAgICAgICAgICBoZWlnaHQ9IHRvb2x0aXAuaGVpZ2h0KCk7XG5cbiAgICAgICAgICAgIC8vIHB1dCB0b29sdGlwIGFib3ZlIGlmIGl0J3MgbmVhciB0aGUgc2NyZWVuJ3MgYm90dG9tIGJvcmRlclxuICAgICAgICAgICAgaWYgKGV2ZW50LnBhZ2VZKzEwK2hlaWdodCA8ICRib2R5LmhlaWdodCgpKSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCAoZXZlbnQucGFnZVkrMTApKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCAoZXZlbnQucGFnZVktMTAtaGVpZ2h0KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHB1dCB0b29sdGlwIG9uIGxlZnQgaWYgaXQncyBuZWFyIHRoZSBzY3JlZW4ncyByaWdodCBib3JkZXJcbiAgICAgICAgICAgIGlmIChldmVudC5wYWdlWCsxMCsgd2lkdGggPCAkYm9keS53aWR0aCgpKSB7XG4gICAgICAgICAgICAgIHRvb2x0aXAuY3NzKCdsZWZ0JywgKGV2ZW50LnBhZ2VYKzEwKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIChldmVudC5wYWdlWC0xMC13aWR0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIFRPT0xUSVBfVElNRU9VVCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB2aWV3T25Nb3VzZU91dChldmVudCwgaXRlbSkge1xuICAgICAgICAgIC8vY2xlYXIgcG9zaXRpb25zXG4gICAgICAgICAgdmFyIHRvb2x0aXAgPSBlbGVtZW50LmZpbmQoJy52aXMtdG9vbHRpcCcpO1xuICAgICAgICAgIHRvb2x0aXAuY3NzKCd0b3AnLCBudWxsKTtcbiAgICAgICAgICB0b29sdGlwLmNzcygnbGVmdCcsIG51bGwpO1xuICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChzY29wZS50b29sdGlwUHJvbWlzZSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvb2x0aXBBY3RpdmUpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQX0VORCwgaXRlbS5kYXR1bSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNjb3BlLnRvb2x0aXBBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICBzY29wZS5kYXRhID0gW107XG4gICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmdTcGVjKCkge1xuICAgICAgICAgIHZhciBjb25maWdTZXQgPSBzY29wZS5jb25maWdTZXQgfHwgY29uc3RzLmRlZmF1bHRDb25maWdTZXQgfHwge307XG5cbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LnZsU3BlYykgcmV0dXJuO1xuXG4gICAgICAgICAgdmFyIHZsU3BlYyA9IF8uY2xvbmVEZWVwKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgZGwuZXh0ZW5kKHZsU3BlYy5jb25maWcsIENvbmZpZ1tjb25maWdTZXRdKCkpO1xuXG4gICAgICAgICAgLy8gdXNlIGNoYXJ0IHN0YXRzIGlmIGF2YWlsYWJsZSAoZm9yIGV4YW1wbGUgZnJvbSBib29rbWFya3MpXG4gICAgICAgICAgdmFyIHN0YXRzID0gc2NvcGUuY2hhcnQuc3RhdHMgfHwgRGF0YXNldC5zdGF0cztcblxuICAgICAgICAgIC8vIFNwZWNpYWwgUnVsZXNcbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSB2bFNwZWMuZW5jb2Rpbmc7XG4gICAgICAgICAgaWYgKGVuY29kaW5nKSB7XG4gICAgICAgICAgICAvLyBwdXQgeC1heGlzIG9uIHRvcCBpZiB0b28gaGlnaC1jYXJkaW5hbGl0eVxuICAgICAgICAgICAgaWYgKGVuY29kaW5nLnkgJiYgZW5jb2RpbmcueS5maWVsZCAmJiBbdmwudHlwZS5OT01JTkFMLCB2bC50eXBlLk9SRElOQUxdLmluZGV4T2YoZW5jb2RpbmcueS50eXBlKSA+IC0xKSB7XG4gICAgICAgICAgICAgIGlmIChlbmNvZGluZy54KSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkU3RhdHMgPSBzdGF0c1tlbmNvZGluZy55LmZpZWxkXTtcbiAgICAgICAgICAgICAgICBpZiAoZmllbGRTdGF0cyAmJiB2bC5maWVsZERlZi5jYXJkaW5hbGl0eShlbmNvZGluZy55LCBzdGF0cykgPiAzMCkge1xuICAgICAgICAgICAgICAgICAgKGVuY29kaW5nLnguYXhpcyA9IGVuY29kaW5nLnguYXhpcyB8fCB7fSkub3JpZW50ID0gJ3RvcCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzZSBzbWFsbGVyIGJhbmQgc2l6ZSBpZiBoYXMgWCBvciBZIGhhcyBjYXJkaW5hbGl0eSA+IDEwIG9yIGhhcyBhIGZhY2V0XG4gICAgICAgICAgICBpZiAoZW5jb2Rpbmcucm93IHx8XG4gICAgICAgICAgICAgICAgKGVuY29kaW5nLnkgJiYgc3RhdHNbZW5jb2RpbmcueS5maWVsZF0gJiYgdmwuZmllbGREZWYuY2FyZGluYWxpdHkoZW5jb2RpbmcueSwgc3RhdHMpID4gMTApKSB7XG4gICAgICAgICAgICAgIChlbmNvZGluZy55LnNjYWxlID0gZW5jb2RpbmcueS5zY2FsZSB8fCB7fSkuYmFuZFNpemUgPSAxMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVuY29kaW5nLmNvbHVtbiB8fFxuICAgICAgICAgICAgICAgIChlbmNvZGluZy54ICYmIHN0YXRzW2VuY29kaW5nLnguZmllbGRdICYmIHZsLmZpZWxkRGVmLmNhcmRpbmFsaXR5KGVuY29kaW5nLngsIHN0YXRzKSA+IDEwKSkge1xuICAgICAgICAgICAgICAoZW5jb2RpbmcueC5zY2FsZSA9IGVuY29kaW5nLnguc2NhbGUgfHwge30pLmJhbmRTaXplID0gMTI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChlbmNvZGluZy5jb2xvciAmJiBlbmNvZGluZy5jb2xvci50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgJiZcbiAgICAgICAgICAgICAgICB2bC5maWVsZERlZi5jYXJkaW5hbGl0eShlbmNvZGluZy5jb2xvciwgc3RhdHMpID4gMTApIHtcbiAgICAgICAgICAgICAgKGVuY29kaW5nLmNvbG9yLnNjYWxlID0gZW5jb2RpbmcuY29sb3Iuc2NhbGUgfHwge30pLnJhbmdlID0gJ2NhdGVnb3J5MjAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB2bC5jb21waWxlKHZsU3BlYykuc3BlYztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZpc0VsZW1lbnQoKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2NhbGVJZkVuYWJsZSgpIHtcbiAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGdldFZpc0VsZW1lbnQoKTtcbiAgICAgICAgICBpZiAoc2NvcGUucmVzY2FsZSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byBkaWdlc3QgdGhlIHNjb3BlIHRvIGVuc3VyZSB0aGF0XG4gICAgICAgICAgICAvLyBlbGVtZW50LndpZHRoKCkgaXMgYm91bmQgYnkgcGFyZW50IGVsZW1lbnQhXG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAwLjIsXG4gICAgICAgICAgICAgICAgZWxlbWVudC53aWR0aCgpIC8gIC8qIHdpZHRoIG9mIHZscGxvdCBib3VuZGluZyBib3ggKi9cbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCAvKiB3aWR0aCBvZiB0aGUgdmlzICovXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh4UmF0aW8gPCAxKSB7XG4gICAgICAgICAgICAgIHZpc0VsZW1lbnQud2lkdGgoc2NvcGUud2lkdGggKiB4UmF0aW8pXG4gICAgICAgICAgICAgICAgICAgICAgICAuaGVpZ2h0KHNjb3BlLmhlaWdodCAqIHhSYXRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgLmNzcygndHJhbnNmb3JtLW9yaWdpbicsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyB2bC5zaG9ydGhhbmQuc2hvcnRlbihzY29wZS5jaGFydC52bFNwZWMpIDogJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyUXVldWVOZXh0KCkge1xuICAgICAgICAgIC8vIHJlbmRlciBuZXh0IGl0ZW0gaW4gdGhlIHF1ZXVlXG4gICAgICAgICAgaWYgKHJlbmRlclF1ZXVlLnNpemUoKSA+IDApIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gcmVuZGVyUXVldWUucG9wKCk7XG4gICAgICAgICAgICBuZXh0LnBhcnNlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG9yIHNheSB0aGF0IG5vIG9uZSBpcyByZW5kZXJpbmdcbiAgICAgICAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlbmRlcihzcGVjKSB7XG4gICAgICAgICAgaWYgKCFzcGVjKSB7XG4gICAgICAgICAgICBpZiAodmlldykge1xuICAgICAgICAgICAgICB2aWV3Lm9mZignbW91c2VvdmVyJyk7XG4gICAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHNwZWMuaGVpZ2h0O1xuICAgICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2FuIG5vdCBmaW5kIHZpcyBlbGVtZW50Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHNob3J0aGFuZCA9IGdldFNob3J0aGFuZCgpO1xuXG4gICAgICAgICAgc2NvcGUucmVuZGVyZXIgPSBnZXRSZW5kZXJlcihzcGVjKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIHBhcnNlVmVnYSgpIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIGxvbmdlciBhIHBhcnQgb2YgdGhlIGxpc3QsIGNhbmNlbCFcbiAgICAgICAgICAgIGlmIChzY29wZS5kZXN0cm95ZWQgfHwgc2NvcGUuZGlzYWJsZWQgfHwgKHNjb3BlLmlzSW5MaXN0ICYmIHNjb3BlLmNoYXJ0LmZpZWxkU2V0S2V5ICYmICFzY29wZS5pc0luTGlzdChzY29wZS5jaGFydC5maWVsZFNldEtleSkpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW5jZWwgcmVuZGVyaW5nJywgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAvLyByZW5kZXIgaWYgc3RpbGwgYSBwYXJ0IG9mIHRoZSBsaXN0XG4gICAgICAgICAgICB2Zy5wYXJzZS5zcGVjKHNwZWMsIGZ1bmN0aW9uKGNoYXJ0KSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGVuZFBhcnNlID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgICAgICAgdmlldyA9IGNoYXJ0KHtlbDogZWxlbWVudFswXX0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjb25zdHMudXNlVXJsKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LmRhdGEoe3JhdzogRGF0YXNldC5kYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdmlldy5yZW5kZXJlcihnZXRSZW5kZXJlcihzcGVjLndpZHRoLCBzY29wZS5oZWlnaHQpKTtcbiAgICAgICAgICAgICAgICB2aWV3LnVwZGF0ZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHZpc0VsZW1lbnQgPSBlbGVtZW50LmZpbmQoJy52ZWdhID4gOmZpcnN0LWNoaWxkJyk7XG4gICAgICAgICAgICAgICAgLy8gcmVhZCAgPGNhbnZhcz4vPHN2Zz7igJlzIHdpZHRoIGFuZCBoZWlnaHQsIHdoaWNoIGlzIHZlZ2EncyBvdXRlciB3aWR0aCBhbmQgaGVpZ2h0IHRoYXQgaW5jbHVkZXMgYXhlcyBhbmQgbGVnZW5kc1xuICAgICAgICAgICAgICAgIHNjb3BlLndpZHRoID0gIHZpc0VsZW1lbnQud2lkdGgoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5oZWlnaHQgPSB2aXNFbGVtZW50LmhlaWdodCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNvbnN0cy5kZWJ1Zykge1xuICAgICAgICAgICAgICAgICAgJHdpbmRvdy52aWV3cyA9ICR3aW5kb3cudmlld3MgfHwge307XG4gICAgICAgICAgICAgICAgICAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF0gPSB2aWV3O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9SRU5ERVIsICcnLCBzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgICAgICAgIHJlc2NhbGVJZkVuYWJsZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGVuZENoYXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3BhcnNlIHNwZWMnLCAoZW5kUGFyc2Utc3RhcnQpLCAnY2hhcnRpbmcnLCAoZW5kQ2hhcnQtZW5kUGFyc2UpLCBzaG9ydGhhbmQpO1xuICAgICAgICAgICAgICAgIGlmIChzY29wZS50b29sdGlwKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3Lm9uKCdtb3VzZW92ZXInLCB2aWV3T25Nb3VzZU92ZXIpO1xuICAgICAgICAgICAgICAgICAgdmlldy5vbignbW91c2VvdXQnLCB2aWV3T25Nb3VzZU91dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlLCBKU09OLnN0cmluZ2lmeShzcGVjKSk7XG4gICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFyZW5kZXJpbmcpIHsgLy8gaWYgbm8gaW5zdGFuY2UgaXMgYmVpbmcgcmVuZGVyIC0tIHJlbmRlcmluZyBub3dcbiAgICAgICAgICAgIHJlbmRlcmluZz10cnVlO1xuICAgICAgICAgICAgcGFyc2VWZWdhKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBxdWV1ZSBpdFxuICAgICAgICAgICAgcmVuZGVyUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgIHByaW9yaXR5OiBzY29wZS5wcmlvcml0eSB8fCAwLFxuICAgICAgICAgICAgICBwYXJzZTogcGFyc2VWZWdhXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdmlldztcbiAgICAgICAgc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIE9taXQgZGF0YSBwcm9wZXJ0eSB0byBzcGVlZCB1cCBkZWVwIHdhdGNoXG4gICAgICAgICAgcmV0dXJuIF8ub21pdChzY29wZS5jaGFydC52bFNwZWMsICdkYXRhJyk7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBzcGVjID0gc2NvcGUuY2hhcnQudmdTcGVjID0gZ2V0VmdTcGVjKCk7XG4gICAgICAgICAgaWYgKCFzY29wZS5jaGFydC5jbGVhblNwZWMpIHtcbiAgICAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICAgICBzY29wZS5jaGFydC5jbGVhblNwZWMgPSBzY29wZS5jaGFydC52bFNwZWM7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlbmRlcihzcGVjKTtcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCd2bHBsb3QgZGVzdHJveWVkJyk7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW92ZXInKTtcbiAgICAgICAgICAgIHZpZXcub2ZmKCdtb3VzZW91dCcpO1xuICAgICAgICAgICAgdmlldyA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcbiAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgIGRlbGV0ZSAkd2luZG93LnZpZXdzW3Nob3J0aGFuZF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwJywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzLCBkbCwgdmwsIERhdGFzZXQsIExvZ2dlciwgXykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZ2V0RHJvcFRhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF07XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyogcGFzcyB0byB2bHBsb3QgKiovXG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJz0nLFxuICAgICAgICBpc0luTGlzdDogJz0nLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc9JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG1heEhlaWdodDogJz0nLFxuICAgICAgICBtYXhXaWR0aDogJz0nLFxuICAgICAgICBvdmVyZmxvdzogJz0nLFxuICAgICAgICBwcmlvcml0eTogJz0nLFxuICAgICAgICByZXNjYWxlOiAnPScsXG4gICAgICAgIHRodW1ibmFpbDogJz0nLFxuICAgICAgICB0b29sdGlwOiAnPScsXG5cbiAgICAgICAgLyogdmxwbG90Z3JvdXAgc3BlY2lmaWMgKi9cblxuICAgICAgICBmaWVsZFNldDogJz0nLFxuXG4gICAgICAgIHNob3dCb29rbWFyazogJ0AnLFxuICAgICAgICBzaG93RGVidWc6ICc9JyxcbiAgICAgICAgc2hvd0V4cGFuZDogJz0nLFxuICAgICAgICBzaG93RmlsdGVyTnVsbDogJ0AnLFxuICAgICAgICBzaG93TGFiZWw6ICdAJyxcbiAgICAgICAgc2hvd0xvZzogJ0AnLFxuICAgICAgICBzaG93TWFyazogJ0AnLFxuICAgICAgICBzaG93U29ydDogJ0AnLFxuICAgICAgICBzaG93VHJhbnNwb3NlOiAnQCcsXG5cbiAgICAgICAgYWx3YXlzU2VsZWN0ZWQ6ICc9JyxcbiAgICAgICAgaXNTZWxlY3RlZDogJz0nLFxuICAgICAgICBoaWdobGlnaHRlZDogJz0nLFxuICAgICAgICBleHBhbmRBY3Rpb246ICcmJyxcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSkge1xuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlID0gZmllbGREZWYuc2NhbGUgfHwge307XG5cbiAgICAgICAgICBzY2FsZS50eXBlID0gc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnO1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5MT0dfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICB9O1xuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgY2hhbm5lbCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZERlZi5zY2FsZSA9IGZpZWxkRGVmLnNjYWxlIHx8IHt9O1xuXG4gICAgICAgICAgcmV0dXJuIHNjYWxlLnR5cGUgPT09ICdsb2cnO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBGSUxURVJcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCB0b2dnbGVGaWx0ZXJOdWxsIHRvIGJlIGl0cyBvd24gY2xhc3NcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5OVUxMX0ZJTFRFUl9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCk7XG5cbiAgICAgICAgICBzcGVjLmNvbmZpZyA9IHNwZWMuY29uZmlnIHx8IHt9O1xuICAgICAgICAgIHNwZWMuY29uZmlnLmZpbHRlck51bGwgPSBzcGVjLmNvbmZpZy5maWx0ZXJOdWxsID09PSB0cnVlID8gdW5kZWZpbmVkIDogdHJ1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVGaWx0ZXJOdWxsLnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBzdGF0cykge1xuICAgICAgICAgIHZhciBmaWVsZERlZnMgPSB2bC5zcGVjLmZpZWxkRGVmcyhzcGVjKTtcbiAgICAgICAgICBmb3IgKHZhciBpIGluIGZpZWxkRGVmcykge1xuICAgICAgICAgICAgdmFyIGZpZWxkRGVmID0gZmllbGREZWZzW2ldO1xuICAgICAgICAgICAgaWYgKF8uaW5jbHVkZXMoW3ZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXSwgZmllbGREZWYudHlwZSkgJiZcbiAgICAgICAgICAgICAgICAoZmllbGREZWYubmFtZSBpbiBzdGF0cykgJiZcbiAgICAgICAgICAgICAgICBzdGF0c1tmaWVsZERlZi5uYW1lXS5taXNzaW5nID4gMFxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgU09SVFxuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IHRvZ2dsZVNvcnQgdG8gYmUgaXRzIG93biBjbGFzc1xuXG4gICAgICAgIHZhciB0b2dnbGVTb3J0ID0gc2NvcGUudG9nZ2xlU29ydCA9IHt9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQubW9kZXMgPSBbJ29yZGluYWwtYXNjZW5kaW5nJywgJ29yZGluYWwtZGVzY2VuZGluZycsXG4gICAgICAgICAgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnLCAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnLCAnY3VzdG9tJ107XG5cbiAgICAgICAgdG9nZ2xlU29ydC50b2dnbGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNPUlRfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQpO1xuICAgICAgICAgIHZhciBjdXJyZW50TW9kZSA9IHRvZ2dsZVNvcnQubW9kZShzcGVjKTtcbiAgICAgICAgICB2YXIgY3VycmVudE1vZGVJbmRleCA9IHRvZ2dsZVNvcnQubW9kZXMuaW5kZXhPZihjdXJyZW50TW9kZSk7XG5cbiAgICAgICAgICB2YXIgbmV3TW9kZUluZGV4ID0gKGN1cnJlbnRNb2RlSW5kZXggKyAxKSAlICh0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgIHZhciBuZXdNb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tuZXdNb2RlSW5kZXhdO1xuXG4gICAgICAgICAgY29uc29sZS5sb2coJ3RvZ2dsZVNvcnQnLCBjdXJyZW50TW9kZSwgbmV3TW9kZSk7XG5cbiAgICAgICAgICB2YXIgY2hhbm5lbHMgPSB0b2dnbGVTb3J0LmNoYW5uZWxzKHNwZWMpO1xuICAgICAgICAgIHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydCA9IHRvZ2dsZVNvcnQuZ2V0U29ydChuZXdNb2RlLCBzcGVjKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKiogR2V0IHNvcnQgcHJvcGVydHkgZGVmaW5pdGlvbiB0aGF0IG1hdGNoZXMgZWFjaCBtb2RlLiAqL1xuICAgICAgICB0b2dnbGVTb3J0LmdldFNvcnQgPSBmdW5jdGlvbihtb2RlLCBzcGVjKSB7XG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnZGVzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgcUVuY0RlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMucXVhbnRpdGF0aXZlXTtcblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnYXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdkZXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgc29ydCA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydDtcblxuICAgICAgICAgIGlmIChzb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnb3JkaW5hbC1hc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxIDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBzb3J0IG1hdGNoZXMgYW55IG9mIHRoZSBzb3J0IGZvciBlYWNoIG1vZGUgZXhjZXB0ICdjdXN0b20nLlxuICAgICAgICAgICAgdmFyIG1vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIHNvcnRPZk1vZGUgPSB0b2dnbGVTb3J0LmdldFNvcnQobW9kZSwgc3BlYyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRXF1YWwoc29ydCwgc29ydE9mTW9kZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGRsLmlzT2JqZWN0KHNvcnQpICYmIHNvcnQub3AgJiYgc29ydC5maWVsZCkge1xuICAgICAgICAgICAgcmV0dXJuICdjdXN0b20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdpbnZhbGlkIG1vZGUnKTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LmNoYW5uZWxzID0gZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIHJldHVybiBzcGVjLmVuY29kaW5nLngudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk9SRElOQUwgP1xuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd4JywgcXVhbnRpdGF0aXZlOiAneSd9IDpcbiAgICAgICAgICAgICAgICAgIHtvcmRpbmFsOiAneScsIHF1YW50aXRhdGl2ZTogJ3gnfTtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0LnN1cHBvcnQgPSBmdW5jdGlvbihzcGVjLCBzdGF0cykge1xuICAgICAgICAgIHZhciBlbmNvZGluZyA9IHNwZWMuZW5jb2Rpbmc7XG5cbiAgICAgICAgICBpZiAodmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAncm93JykgfHwgdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAnY29sdW1uJykgfHxcbiAgICAgICAgICAgICF2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICd4JykgfHwgIXZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3knKSB8fFxuICAgICAgICAgICAgIXZsLnNwZWMuYWx3YXlzTm9PY2NsdXNpb24oc3BlYywgc3RhdHMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgKGVuY29kaW5nLngudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IGVuY29kaW5nLngudHlwZSA9PT0gdmwudHlwZS5PUkRJTkFMKSAmJlxuICAgICAgICAgICAgICB2bC5maWVsZERlZi5pc01lYXN1cmUoZW5jb2RpbmcueSlcbiAgICAgICAgICAgICkgPyAneCcgOlxuICAgICAgICAgICAgKFxuICAgICAgICAgICAgICAoZW5jb2RpbmcueS50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgZW5jb2RpbmcueS50eXBlID09PSB2bC50eXBlLk9SRElOQUwpICYmXG4gICAgICAgICAgICAgIHZsLmZpZWxkRGVmLmlzTWVhc3VyZShlbmNvZGluZy54KVxuICAgICAgICAgICAgKSA/ICd5JyA6IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZVNvcnRDbGFzcyA9IGZ1bmN0aW9uKHZsU3BlYykge1xuICAgICAgICAgIGlmICghdmxTcGVjIHx8ICF0b2dnbGVTb3J0LnN1cHBvcnQodmxTcGVjLCBEYXRhc2V0LnN0YXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuICdpbnZpc2libGUnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBvcmRpbmFsQ2hhbm5lbCA9IHZsU3BlYyAmJiB0b2dnbGVTb3J0LmNoYW5uZWxzKHZsU3BlYykub3JkaW5hbCxcbiAgICAgICAgICAgIG1vZGUgPSB2bFNwZWMgJiYgdG9nZ2xlU29ydC5tb2RlKHZsU3BlYyk7XG5cbiAgICAgICAgICB2YXIgZGlyZWN0aW9uQ2xhc3MgPSBvcmRpbmFsQ2hhbm5lbCA9PT0gJ3gnID8gJ3NvcnQteCAnIDogJyc7XG5cbiAgICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ29yZGluYWwtYXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYWxwaGEtYXNjJztcbiAgICAgICAgICAgIGNhc2UgJ29yZGluYWwtZGVzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFscGhhLWRlc2MnO1xuICAgICAgICAgICAgY2FzZSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFtb3VudC1hc2MnO1xuICAgICAgICAgICAgY2FzZSAncXVhbnRpdGF0aXZlLWRlc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbW91bnQtZGVzYyc7XG4gICAgICAgICAgICBkZWZhdWx0OiAvLyBjdXN0b21cbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQnO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50cmFuc3Bvc2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuVFJBTlNQT1NFX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kKTtcbiAgICAgICAgICB2bC5zcGVjLnRyYW5zcG9zZShzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5jaGFydCA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwUG9wdXAnLCBmdW5jdGlvbiAoRHJvcCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwcG9wdXAuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15edmxQbG90R3JvdXAnLFxuICAgICAgc2NvcGU6IGZhbHNlLFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCB2bFBsb3RHcm91cENvbnRyb2xsZXIpIHtcbiAgICAgICAgdmFyIGRlYnVnUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgY29udGVudDogZWxlbWVudC5maW5kKCcuZGV2LXRvb2wnKVswXSxcbiAgICAgICAgICB0YXJnZXQ6IHZsUGxvdEdyb3VwQ29udHJvbGxlci5nZXREcm9wVGFyZ2V0KCksXG4gICAgICAgICAgcG9zaXRpb246ICdib3R0b20gcmlnaHQnLFxuICAgICAgICAgIG9wZW5PbjogJ2NsaWNrJyxcbiAgICAgICAgICBjb25zdHJhaW5Ub1dpbmRvdzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVidWdQb3B1cC5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2NvbXBhY3RKU09OJywgZnVuY3Rpb24oSlNPTjMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBKU09OMy5zdHJpbmdpZnkoaW5wdXQsIG51bGwsICcgICcsIDgwKTtcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSBmYWNldGVkdml6LmZpbHRlcjpyZXBvcnRVcmxcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHJlcG9ydFVybFxuICogRmlsdGVyIGluIHRoZSBmYWNldGVkdml6LlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ3JlcG9ydFVybCcsIGZ1bmN0aW9uIChjb21wYWN0SlNPTkZpbHRlciwgXywgY29uc3RzKSB7XG4gICAgZnVuY3Rpb24gdm95YWdlclJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xVDlaQTE0RjNtbXpySFI3SkpWVUt5UFh6ck1xRjU0Q2pMSU9qdjJFN1pFTS92aWV3Zm9ybT8nO1xuXG4gICAgICBpZiAocGFyYW1zLmZpZWxkcykge1xuICAgICAgICB2YXIgcXVlcnkgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoXy52YWx1ZXMocGFyYW1zLmZpZWxkcykpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBxdWVyeSArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEzMjM2ODAxMzY9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuc3BlYzIpIHtcbiAgICAgICAgdmFyIHNwZWMyID0gXy5vbWl0KHBhcmFtcy5zcGVjMiwgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjMiA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjMikpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5Ljg1MzEzNzc4Nj0nICsgc3BlYzIgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIHZhciB0eXBlUHJvcCA9ICdlbnRyeS4xOTQwMjkyNjc3PSc7XG4gICAgICBzd2l0Y2ggKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3ZsJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnVmlzdWFsaXphdGlvbitSZW5kZXJpbmcrKFZlZ2FsaXRlKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd2cic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK0FsZ29yaXRobSsoVmlzcmVjKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK1VJKyhGYWNldGVkVml6KSYnO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZsdWlSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMXhLcy1xR2FMWkVVZmJUbWhkbVNvUzEzT0tPRXB1dV9OTldFNVRBQW1sX1kvdmlld2Zvcm0/JztcbiAgICAgIGlmIChwYXJhbXMuc3BlYykge1xuICAgICAgICB2YXIgc3BlYyA9IF8ub21pdChwYXJhbXMuc3BlYywgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBzcGVjICsgJyYnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uc3RzLmFwcElkID09PSAndm95YWdlcicgPyB2b3lhZ2VyUmVwb3J0IDogdmx1aVJlcG9ydDtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6ZW5jb2RlVXJpXG4gKiBAZnVuY3Rpb25cbiAqIEBkZXNjcmlwdGlvblxuICogIyBlbmNvZGVVcmlcbiAqIEZpbHRlciBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2VuY29kZVVSSScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gd2luZG93LmVuY29kZVVSSShpbnB1dCk7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6dW5kZXJzY29yZTJzcGFjZVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdW5kZXJzY29yZTJzcGFjZVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigndW5kZXJzY29yZTJzcGFjZScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gaW5wdXQgPyBpbnB1dC5yZXBsYWNlKC9fKy9nLCAnICcpIDogJyc7XG4gICAgfTtcbiAgfSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
